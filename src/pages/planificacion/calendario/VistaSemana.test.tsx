// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Programacion, Restriccion } from '@/types/planificacion'
import { diasDeSemana, eventosDeCapas } from './calendarioCapas'
import DetalleActividad from './DetalleActividad'
import VistaSemana from './VistaSemana'

afterEach(cleanup)

const corte: Programacion = {
  id: 1,
  tipo_servicio_id: 1,
  servicio: 'Corte de césped',
  proveedor_id: 3,
  proveedor: 'Servicios Verdes Demo S.A.C.',
  estacion: 'Primavera',
  fecha_inicio_prevista: '2026-11-16',
  fecha_fin_prevista: '2026-11-19',
  estado: 'Programada',
  fecha_inicio_real: null,
  fecha_fin_real: null,
}
const riego: Programacion = { ...corte, id: 2, servicio: 'Riego · Cuad. B', proveedor: null, fecha_inicio_prevista: '2026-11-18', fecha_fin_prevista: '2026-11-18' }
const jueves: Restriccion = {
  id: 9,
  tipo_restriccion_id: 1,
  tipo: 'Jueves culturales',
  efecto: 'Advertencia',
  aplica_servicios_ruidosos: true,
  fecha_inicio: '2026-11-19',
  fecha_fin: '2026-11-19',
  hora_inicio: null,
  hora_fin: null,
  area_verde_id: null,
  descripcion: null,
  serie: null,
}
const eventos = eventosDeCapas([jueves], [corte, riego])

describe('VistaSemana', () => {
  it('pone las barras y restricciones en «todo el día» y cada actividad de un día en su columna', () => {
    render(<VistaSemana dias={diasDeSemana('2026-11-16')} eventos={eventos} hoy="2026-11-04" seleccionada={null} onSeleccionar={vi.fn()} />)

    const todoElDia = screen.getByRole('group', { name: 'Todo el día' })
    expect(within(todoElDia).getByText('Jueves culturales')).toBeTruthy()
    expect(within(todoElDia).getByRole('button', { name: /Corte de césped/ })).toBeTruthy()
    expect(within(screen.getByRole('list', { name: 'Actividades del 18' })).getByRole('button', { name: 'Riego · Cuad. B, Personal propio' })).toBeTruthy()
  })

  it('al pulsar una actividad la selecciona', async () => {
    const onSeleccionar = vi.fn()
    render(<VistaSemana dias={diasDeSemana('2026-11-16')} eventos={eventos} hoy="2026-11-04" seleccionada={null} onSeleccionar={onSeleccionar} />)

    await userEvent.setup().click(screen.getByRole('button', { name: /Corte de césped/ }))
    expect(onSeleccionar).toHaveBeenCalledWith('p-1')
  })
})

describe('DetalleActividad', () => {
  it('muestra fechas, responsable y las restricciones con las que coincide', () => {
    const actividad = eventos.find((evento) => evento.clave === 'p-1')
    if (!actividad) throw new Error('falta la actividad')
    render(<DetalleActividad actividad={actividad} eventos={eventos} onCerrar={vi.fn()} />)

    expect(screen.getByText('16 al 19 nov.')).toBeTruthy()
    expect(screen.getByText('Servicios Verdes Demo S.A.C.')).toBeTruthy()
    expect(screen.getByText('19 nov. · Jueves culturales')).toBeTruthy()
  })
})
