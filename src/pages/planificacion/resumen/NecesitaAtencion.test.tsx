// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { RUTAS_PLANIFICACION } from '@/router/rutasApp'
import type { AlertaPlanificacion, ServicioPeriodico } from '@/types/planificacion'
import NecesitaAtencion from './NecesitaAtencion'

const motivo = vi.hoisted(() => vi.fn(async (id: number, texto: string) => ({ id, estado: 'Atendida', motivo: texto })))
vi.mock('@/services/api/planificacion', () => ({ registrarMotivoAlerta: motivo }))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false
  }
})
afterEach(cleanup)

const alertas: AlertaPlanificacion[] = [
  { tipo: 'FrecuenciaProxima', servicio_id: 1, servicio: 'Corte de césped', programacion_id: null, dias: 7, mensaje: '' },
  { tipo: 'DuracionExcedida', servicio_id: 2, servicio: 'Poda mayor', programacion_id: 40, dias: 1, mensaje: '' },
]
const sinDuracion: ServicioPeriodico[] = [{ id: 9, nombre: 'Control fitosanitario', es_ruidoso: false, frecuencias: [], duracion: null }]

function pintar(a: AlertaPlanificacion[], s: ServicioPeriodico[]) {
  render(
    <MemoryRouter>
      <NecesitaAtencion alertas={a} servicios={s} />
    </MemoryRouter>,
  )
  return screen.getByRole('region', { name: 'Necesita atención' })
}

describe('NecesitaAtencion', () => {
  it('lleva cada tipo de alerta a su pantalla y cuenta los elementos', () => {
    const bandeja = pintar(alertas, sinDuracion)

    expect(within(bandeja).getByText('3')).toBeTruthy()
    expect(within(bandeja).getByRole('link', { name: 'Programar' }).getAttribute('href')).toBe(`${RUTAS_PLANIFICACION.calendario}?programar=1`)
    expect(within(bandeja).getByRole('link', { name: 'Ver ciclo' }).getAttribute('href')).toBe(`${RUTAS_PLANIFICACION.ciclos}/40`)
    expect(within(bandeja).getByRole('link', { name: 'Configurar' }).getAttribute('href')).toBe(RUTAS_PLANIFICACION.configuracion)
  })

  it('pone primero lo excedido', () => {
    const bandeja = pintar(alertas, sinDuracion)

    const titulos = within(bandeja).getAllByRole('listitem').map((fila) => fila.textContent ?? '')
    expect(titulos[0]).toContain('Poda mayor · duración excedida en 1 día')
    expect(titulos[2]).toContain('Control fitosanitario · sin duración configurada')
  })

  it('con el contrato de AV-255 registra el motivo de la duración excedida y la saca de la bandeja', async () => {
    const usuario = userEvent.setup()
    const bandeja = pintar([{ ...alertas[1], id: 40, proveedor: 'Podas Altura Demo E.I.R.L.', maximo_dias: 10 }], [])

    await usuario.click(within(bandeja).getByRole('button', { name: 'Registrar motivo' }))
    const dialogo = screen.getByRole('dialog', { name: 'Registrar motivo' })
    expect(within(dialogo).getByText('Poda mayor · 1 día de exceso')).toBeTruthy()
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar' }))
    expect(motivo).not.toHaveBeenCalled()
    expect(within(dialogo).getByText('Escribe el motivo o la acción.')).toBeTruthy()

    await usuario.type(within(dialogo).getByLabelText(/^Motivo o acción/), 'Lluvia el 27/10; el proveedor termina mañana.')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar' }))
    expect(motivo).toHaveBeenCalledWith(40, 'Lluvia el 27/10; el proveedor termina mañana.')
    expect(await screen.findByText('Motivo registrado')).toBeTruthy()
    expect(within(bandeja).queryByText('Poda mayor · 1 día de exceso')).toBeNull()
  })

  it('sin nada pendiente muestra el estado vacío', () => {
    const bandeja = pintar([], [])

    expect(within(bandeja).getByRole('heading', { name: 'Todo al día' })).toBeTruthy()
    expect(within(bandeja).queryByRole('list')).toBeNull()
  })
})
