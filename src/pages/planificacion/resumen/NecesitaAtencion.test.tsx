// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { RUTAS_PLANIFICACION } from '@/router/rutasApp'
import type { AlertaPlanificacion, ServicioPeriodico } from '@/types/planificacion'
import NecesitaAtencion from './NecesitaAtencion'

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
    expect(within(bandeja).getByRole('link', { name: 'Ver ciclo' }).getAttribute('href')).toBe(`${RUTAS_PLANIFICACION.calendario}?ciclo=40`)
    expect(within(bandeja).getByRole('link', { name: 'Configurar' }).getAttribute('href')).toBe(RUTAS_PLANIFICACION.configuracion)
  })

  it('pone primero lo excedido', () => {
    const bandeja = pintar(alertas, sinDuracion)

    const titulos = within(bandeja).getAllByRole('listitem').map((fila) => fila.textContent ?? '')
    expect(titulos[0]).toContain('Poda mayor · duración excedida en 1 día')
    expect(titulos[2]).toContain('Control fitosanitario · sin duración configurada')
  })

  it('sin nada pendiente muestra el estado vacío', () => {
    const bandeja = pintar([], [])

    expect(within(bandeja).getByRole('heading', { name: 'Todo al día' })).toBeTruthy()
    expect(within(bandeja).queryByRole('list')).toBeNull()
  })
})
