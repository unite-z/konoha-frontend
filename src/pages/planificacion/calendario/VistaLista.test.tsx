// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Programacion, Restriccion } from '@/types/planificacion'
import { eventosDeCapas } from './calendarioCapas'
import VistaLista from './VistaLista'

afterEach(cleanup)

const base: Programacion = {
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

describe('VistaLista', () => {
  it('lista las actividades del periodo con su responsable, estado y restricciones', () => {
    const eventos = eventosDeCapas([jueves], [base, { ...base, id: 2, servicio: 'Riego', proveedor: null, fecha_inicio_prevista: '2026-11-03', fecha_fin_prevista: '2026-11-03' }])
    render(<VistaLista eventos={eventos} desde="2026-11-01" hasta="2026-11-30" />)

    const filas = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    expect(filas.map((fila) => within(fila).getAllByRole('cell')[1].textContent)).toEqual(['Riego', 'Corte de césped'])
    expect(within(filas[0]).getByText('Personal propio')).toBeTruthy()
    expect(within(filas[1]).getByText('Jue 19 · Jueves culturales')).toBeTruthy()
    expect(within(filas[1]).getByText('16 al 19')).toBeTruthy()
  })

  it('sin actividades muestra el estado vacío', () => {
    render(<VistaLista eventos={eventosDeCapas([jueves], [])} desde="2026-11-01" hasta="2026-11-30" />)

    expect(screen.getByText('Sin actividades en este periodo')).toBeTruthy()
  })
})
