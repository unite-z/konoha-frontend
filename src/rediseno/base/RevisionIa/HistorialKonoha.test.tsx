// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import { ContextoSesion, type ValorSesion } from '@/sesion/ContextoSesion'
import type { SesionCore } from '@/types/core'
import type { AdaptadorHistorial, EntradaHistorial } from './contrato'
import HistorialKonoha from './HistorialKonoha'

afterEach(cleanup)

const FILAS: EntradaHistorial[] = [
  {
    id: 1,
    estado: 'Propuesta',
    titulo: 'Propuesta 1',
    solicitadaEn: '2026-11-20T15:35:00Z',
    decididaPor: null,
    decididaEn: null,
  },
  {
    id: 2,
    estado: 'Validada',
    titulo: 'Propuesta 2',
    solicitadaEn: '2026-11-21T15:35:00Z',
    etiquetaEstado: 'Validada',
    resumen: '7 aceptadas · 2 modificadas',
    decididaPor: 'Ana Pérez',
    decididaEn: '2026-11-22T10:00:00Z',
  },
]
const PAGINA = { entradas: FILAS, total: 2 }

function adaptadorDe(
  cargar: AdaptadorHistorial['cargar'],
  extra: Partial<AdaptadorHistorial> = {},
): AdaptadorHistorial {
  return {
    ...extra,
    clave: `prueba|${Math.random()}`,
    filtros: [
      {
        clave: 'tipo',
        etiqueta: 'Tipo',
        opciones: [{ valor: 'a', texto: 'Tipo A' }],
      },
    ],
    cargar,
    renderDetalle: (e): ReactNode => <p>Detalle de {e.id}</p>,
  }
}

function montar(permisos: string[], adaptador: AdaptadorHistorial, ruta = '/') {
  const sesion = { permisos } as SesionCore
  const valor = { estado: { tipo: 'activa', sesion } } as ValorSesion
  return render(
    <ContextoSesion.Provider value={valor}>
      <MemoryRouter initialEntries={[ruta]}>
        <HistorialKonoha adaptador={adaptador} />
      </MemoryRouter>
    </ContextoSesion.Provider>,
  )
}

const ENTRA = ['REP.INDICADOR.CONSULTAR']

describe('HistorialKonoha', () => {
  it('sin el permiso de entrada muestra sin acceso y no consulta', () => {
    const cargar = vi.fn()
    montar([], adaptadorDe(cargar))
    expect(screen.getByText(/no tienes permiso/i)).toBeTruthy()
    expect(cargar).not.toHaveBeenCalled()
  })

  it('lista las propuestas con su estado y quién decidió, y abre el detalle', async () => {
    const usuario = userEvent.setup()
    montar(ENTRA, adaptadorDe(vi.fn().mockResolvedValue(PAGINA)))
    expect(await screen.findByText('Propuesta 2')).toBeTruthy()
    expect(screen.getAllByText('Validada').length).toBeGreaterThan(0)
    expect(screen.getByText(/Decidida por Ana Pérez/)).toBeTruthy()
    expect(screen.getByText('7 aceptadas · 2 modificadas')).toBeTruthy()
    const cabecera = screen.getByRole('button', { name: /Propuesta 2/ })
    expect(cabecera.getAttribute('aria-expanded')).toBe('false')
    await usuario.click(cabecera)
    expect(screen.getByText('Detalle de 2')).toBeTruthy()
    expect(cabecera.getAttribute('aria-expanded')).toBe('true')
    await usuario.click(cabecera)
    expect(screen.queryByText('Detalle de 2')).toBeNull()
  })

  it('pasa al adaptador el estado, el filtro y los parámetros de entrada de la URL', async () => {
    const cargar = vi.fn().mockResolvedValue(PAGINA)
    montar(ENTRA, adaptadorDe(cargar), '/?estado=Validada&tipo=a&incidencia_id=7&ejemplar_id=x&tipo2=b&page=3')
    await waitFor(() => expect(cargar).toHaveBeenCalled())
    expect(cargar.mock.calls[0][0]).toEqual({
      estado: 'Validada',
      filtros: { tipo: 'a' },
      entrada: { incidencia_id: '7' },
      pagina: 3,
    })
  })

  it('al elegir un estado vuelve a consultar con él', async () => {
    const usuario = userEvent.setup()
    const cargar = vi.fn().mockResolvedValue(PAGINA)
    montar(ENTRA, adaptadorDe(cargar))
    await screen.findByText('Propuesta 1')
    await usuario.click(screen.getByRole('button', { name: 'Rechazadas' }))
    await waitFor(() => expect(cargar.mock.calls.at(-1)?.[0].estado).toBe('Rechazada'))
  })

  it('usa los textos de estado del adaptador, su estado inicial y el recuento por estado', async () => {
    const usuario = userEvent.setup()
    const cargar = vi.fn().mockResolvedValue(PAGINA)
    const contar = vi.fn().mockResolvedValue({ Propuesta: 3, Validada: 1200 })
    montar(
      ENTRA,
      adaptadorDe(cargar, {
        estadoInicial: 'Propuesta',
        textosEstado: { Validada: 'Confirmadas' },
        contar,
      }),
    )
    await screen.findByText('Propuesta 1')
    expect(cargar.mock.calls[0][0].estado).toBe('Propuesta')
    expect(await screen.findByRole('button', { name: /Confirmadas \(1\s200\)/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Pendientes de revisión \(3\)/ })).toBeTruthy()
    await usuario.click(screen.getByRole('button', { name: 'Todas' }))
    await waitFor(() => expect(cargar.mock.calls.at(-1)?.[0].estado).toBeNull())
  })

  it('pagina con la página en la URL cuando hay más de una', async () => {
    const usuario = userEvent.setup()
    const cargar = vi.fn().mockResolvedValue({ entradas: FILAS, total: 60 })
    montar(ENTRA, adaptadorDe(cargar))
    await screen.findByText('Propuesta 1')
    expect(screen.getByText(/Mostrando 1 a 25 de 60/)).toBeTruthy()
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(cargar.mock.calls.at(-1)?.[0].pagina).toBe(2))
    await usuario.click(screen.getByRole('button', { name: 'Rechazadas' }))
    await waitFor(() =>
      expect(cargar.mock.calls.at(-1)?.[0]).toMatchObject({
        estado: 'Rechazada',
        pagina: 1,
      }),
    )
  })

  it('sin propuestas muestra el estado vacío; con filtros ofrece limpiarlos', async () => {
    const usuario = userEvent.setup()
    montar(ENTRA, adaptadorDe(vi.fn().mockResolvedValue({ entradas: [], total: 0 })), '/?estado=Rechazada')
    expect(await screen.findByText('Ninguna propuesta coincide')).toBeTruthy()
    await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    await waitFor(() => expect(screen.getByText('Aún no hay propuestas')).toBeTruthy())
  })

  it('si falla muestra el error con reintento', async () => {
    montar(ENTRA, adaptadorDe(vi.fn().mockRejectedValue(new ErrorApi(500, 'x', 'Fallo del servidor'))))
    expect(await screen.findByText('No se pudo cargar el historial')).toBeTruthy()
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeTruthy()
  })

  it('un 403 muestra sin acceso', async () => {
    montar(ENTRA, adaptadorDe(vi.fn().mockRejectedValue(new ErrorApi(403, 'x', 'Prohibido'))))
    expect(await screen.findByText(/no tienes permiso/i)).toBeTruthy()
  })

  it('un 404 del endpoint degrada al estado vacío', async () => {
    montar(ENTRA, adaptadorDe(vi.fn().mockRejectedValue(new ErrorApi(404, 'x', 'No encontrado'))))
    expect(await screen.findByText('Aún no hay propuestas')).toBeTruthy()
  })
})
