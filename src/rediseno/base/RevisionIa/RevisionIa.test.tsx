// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import { ContextoSesion, type ValorSesion } from '@/sesion/ContextoSesion'
import type { SesionCore } from '@/types/core'
import type { AdaptadorRevision, PropuestaRevision } from './contrato'
import RevisionIa from './RevisionIa'

afterEach(cleanup)

function propuestaBase(sobre: Partial<PropuestaRevision<number>> = {}): PropuestaRevision<number> {
  return {
    id: 1,
    estado: 'Propuesta',
    resumen: 'Dos prioridades',
    ia: { proveedor: 'gemini', modelo: 'modelo-x', solicitado_en: '2026-11-20T15:35:00Z', duracion_ms: 10 },
    contexto: {
      suficiencia: 'parcial',
      faltantes: ['Sin fotos'],
      datos_utilizados: ['Historial'],
      limitaciones: ['Solo campus'],
      explicacion: 'Criterios',
    },
    elementos: [
      { id: 'a', titulo: 'Elemento A', sugerencia: 'Sugiere 5', valorSugerido: 5, decision: null },
      { id: 'b', titulo: 'Elemento B', sugerencia: 'Sugiere 7', valorSugerido: 7, decision: null },
    ],
    validadaPor: null,
    validadaEn: null,
    motivoRechazo: null,
    ...sobre,
  }
}

function adaptadorDe(
  propuesta: PropuestaRevision<number> | null,
  motivoRechazo: 'obligatorio' | 'opcional' = 'opcional',
) {
  const adaptador: AdaptadorRevision<number> = {
    clave: `prueba|${Math.random()}`,
    tituloFaltantes: 'Faltan datos',
    motivoRechazo,
    cargar: vi.fn().mockResolvedValue(propuesta),
    validar: vi.fn().mockResolvedValue(undefined),
    rechazar: vi.fn().mockResolvedValue(undefined),
    solicitar: vi.fn().mockResolvedValue(undefined),
    mostrarValor: (v: number) => `Valor ${v}`,
    renderHueco: ({ decision, cambiar }): ReactNode =>
      decision.accion === 'corregir' ? (
        <button type="button" onClick={() => cambiar({ valorFinal: 9 })}>
          Poner 9
        </button>
      ) : null,
  }
  return adaptador
}

function conSesion(permisos: string[], hijo: ReactNode) {
  const sesion = { permisos } as SesionCore
  const valor = { estado: { tipo: 'activa', sesion } } as ValorSesion
  return <ContextoSesion.Provider value={valor}>{hijo}</ContextoSesion.Provider>
}

const TODOS = ['REP.INDICADOR.CONSULTAR', 'IA.PROPUESTA.PROPONER', 'IA.PROPUESTA.VALIDAR']

describe('RevisionIa (contrato)', () => {
  it('sin el permiso de entrada no muestra la propuesta', () => {
    const adaptador = adaptadorDe(propuestaBase())
    render(conSesion([], <RevisionIa adaptador={adaptador} />))
    expect(screen.getByText('No tienes permiso')).toBeTruthy()
    expect(adaptador.cargar).not.toHaveBeenCalled()
  })

  it('muestra proveedor, modelo, contexto y el aviso de IA', async () => {
    render(conSesion(TODOS, <RevisionIa adaptador={adaptadorDe(propuestaBase())} />))
    expect(await screen.findByText(/gemini · modelo-x/)).toBeTruthy()
    expect(screen.getByText('Generado por IA · revisa antes de aplicar')).toBeTruthy()
    expect(screen.getByText('Sin fotos')).toBeTruthy()
    expect(screen.getByText('Solo campus')).toBeTruthy()
  })

  it('Aplicar acepta los pendientes y valida', async () => {
    const adaptador = adaptadorDe(propuestaBase())
    render(conSesion(TODOS, <RevisionIa adaptador={adaptador} />))
    await userEvent.click(await screen.findByRole('button', { name: 'Aplicar' }))
    await waitFor(() =>
      expect(adaptador.validar).toHaveBeenCalledWith({
        a: { accion: 'aceptar', valorFinal: 5 },
        b: { accion: 'aceptar', valorFinal: 7 },
      }),
    )
    await waitFor(() => expect(adaptador.cargar).toHaveBeenCalledTimes(2))
  })

  it('aceptar y corregir por elemento', async () => {
    const adaptador = adaptadorDe(propuestaBase())
    render(conSesion(TODOS, <RevisionIa adaptador={adaptador} />))
    await userEvent.click(await screen.findByRole('button', { name: 'Corregir' }))
    await userEvent.click(screen.getAllByRole('radio', { name: 'Aceptar' })[0])
    await userEvent.click(screen.getAllByRole('radio', { name: 'Corregir' })[1])
    await userEvent.click(screen.getByRole('button', { name: 'Poner 9' }))
    await userEvent.click(screen.getByRole('button', { name: 'Validar decisiones' }))
    await waitFor(() =>
      expect(adaptador.validar).toHaveBeenCalledWith({
        a: { accion: 'aceptar', valorFinal: 5 },
        b: { accion: 'corregir', valorFinal: 9 },
      }),
    )
  })

  it('descartar deja el valor final vacío y validar exige decidir todo', async () => {
    const adaptador = adaptadorDe(propuestaBase())
    render(conSesion(TODOS, <RevisionIa adaptador={adaptador} />))
    await userEvent.click(await screen.findByRole('button', { name: 'Corregir' }))
    await userEvent.click(screen.getAllByRole('radio', { name: 'Descartar' })[0])
    await userEvent.click(screen.getByRole('button', { name: 'Validar decisiones' }))
    expect(adaptador.validar).not.toHaveBeenCalled()
    expect(screen.getByText('Falta decidir «Elemento B»')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Aceptar pendientes' }))
    await userEvent.click(screen.getByRole('button', { name: 'Validar decisiones' }))
    await waitFor(() =>
      expect(adaptador.validar).toHaveBeenCalledWith({
        a: { accion: 'descartar', valorFinal: null },
        b: { accion: 'aceptar', valorFinal: 7 },
      }),
    )
  })

  it('rechaza sin motivo si es opcional', async () => {
    const adaptador = adaptadorDe(propuestaBase(), 'opcional')
    render(conSesion(TODOS, <RevisionIa adaptador={adaptador} />))
    await userEvent.click(await screen.findByRole('button', { name: 'Rechazar con motivo' }))
    await userEvent.click(screen.getByRole('button', { name: 'Rechazar propuesta' }))
    await waitFor(() => expect(adaptador.rechazar).toHaveBeenCalledWith(''))
  })

  it('con motivo obligatorio no rechaza vacío y sí con motivo', async () => {
    const adaptador = adaptadorDe(propuestaBase(), 'obligatorio')
    render(conSesion(TODOS, <RevisionIa adaptador={adaptador} />))
    await userEvent.click(await screen.findByRole('button', { name: 'Rechazar con motivo' }))
    await userEvent.click(screen.getByRole('button', { name: 'Rechazar propuesta' }))
    expect(adaptador.rechazar).not.toHaveBeenCalled()
    expect(screen.getByText('Escribe el motivo del rechazo')).toBeTruthy()
    await userEvent.type(screen.getByLabelText(/Motivo del rechazo/), 'Datos viejos')
    await userEvent.click(screen.getByRole('button', { name: 'Rechazar propuesta' }))
    await waitFor(() => expect(adaptador.rechazar).toHaveBeenCalledWith('Datos viejos'))
  })

  it('sin permiso de validar es solo lectura y ya validada muestra la trazabilidad', async () => {
    const validada = propuestaBase({
      estado: 'Validada',
      validadaPor: 'Marta Ruiz',
      validadaEn: '2026-11-21T15:00:00Z',
      elementos: [
        {
          id: 'a',
          titulo: 'Elemento A',
          sugerencia: 'Sugiere 5',
          valorSugerido: 5,
          decision: {
            accion: 'corregir',
            valorFinal: 6,
            comentario: 'Ajustado',
            decididoPor: 'Marta Ruiz',
            decididoEn: '2026-11-21T15:00:00Z',
          },
        },
      ],
    })
    render(conSesion(['REP.INDICADOR.CONSULTAR'], <RevisionIa adaptador={adaptadorDe(validada)} />))
    expect(await screen.findByText('Valor 6')).toBeTruthy()
    expect(screen.getAllByText(/Marta Ruiz/).length).toBe(2)
    expect(screen.getByText('Comentario: Ajustado')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Aplicar' })).toBeNull()
  })

  it('sin permiso de validar una propuesta abierta se ve sin acciones de decisión', async () => {
    render(conSesion(['REP.INDICADOR.CONSULTAR'], <RevisionIa adaptador={adaptadorDe(propuestaBase())} />))
    expect(await screen.findByText('Elemento A')).toBeTruthy()
    expect(screen.queryByRole('radio')).toBeNull()
    expect(screen.queryByRole('button', { name: /Aplicar|Rechazar|Aceptar pendientes/ })).toBeNull()
  })

  it('la propuesta rechazada muestra quién la rechazó, cuándo y el motivo', async () => {
    const rechazada = propuestaBase({
      estado: 'Rechazada',
      validadaPor: 'Luis Paz',
      validadaEn: '2026-11-21T15:00:00Z',
      motivoRechazo: 'Datos viejos',
    })
    render(conSesion(TODOS, <RevisionIa adaptador={adaptadorDe(rechazada)} />))
    expect(await screen.findByText(/Rechazada por Luis Paz · 21/)).toBeTruthy()
    expect(screen.getByText('Datos viejos')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Pedir otro análisis' })).toBeTruthy()
  })

  it('sin propuesta muestra el estado vacío y permite pedir el análisis', async () => {
    const adaptador = adaptadorDe(null)
    render(conSesion(TODOS, <RevisionIa adaptador={adaptador} />))
    await userEvent.click(await screen.findByRole('button', { name: 'Pedir análisis' }))
    await waitFor(() => expect(adaptador.solicitar).toHaveBeenCalled())
  })

  it('un 403 del backend muestra «No tienes permiso»', async () => {
    const adaptador = adaptadorDe(null)
    adaptador.cargar = vi.fn().mockRejectedValue(new ErrorApi(403, null, 'Sin permiso'))
    render(conSesion(TODOS, <RevisionIa adaptador={adaptador} />))
    expect(await screen.findByText('No tienes permiso')).toBeTruthy()
  })

  it('si falla al validar muestra el detalle del backend', async () => {
    const adaptador = adaptadorDe(propuestaBase())
    adaptador.validar = vi.fn().mockRejectedValue(new ErrorApi(422, null, 'Hay un elemento sin valor'))
    render(conSesion(TODOS, <RevisionIa adaptador={adaptador} />))
    await userEvent.click(await screen.findByRole('button', { name: 'Aplicar' }))
    expect(await screen.findByText('Hay un elemento sin valor')).toBeTruthy()
  })
})
