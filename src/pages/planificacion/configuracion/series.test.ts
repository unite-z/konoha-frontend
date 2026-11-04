import { describe, expect, it } from 'vitest'
import type { Restriccion } from '@/types/planificacion'
import { agruparSeries, textoAlcance } from './series'

const base: Restriccion = {
  id: 1,
  tipo_restriccion_id: 1,
  tipo: 'Clases',
  efecto: 'Advertencia',
  aplica_servicios_ruidosos: true,
  fecha_inicio: '2026-11-03',
  fecha_fin: '2026-11-03',
  hora_inicio: '08:00:00',
  hora_fin: '12:00:00',
  area_verde_id: null,
  descripcion: 'Lunes y miércoles',
  serie: 'a',
}

describe('series', () => {
  it('agrupa por serie las fechas de hoy en adelante y deja fuera las sueltas', () => {
    const series = agruparSeries(
      [
        base,
        { ...base, id: 2, fecha_inicio: '2026-11-05', fecha_fin: '2026-11-05' },
        { ...base, id: 3, fecha_inicio: '2026-11-10', fecha_fin: '2026-11-10' },
        { ...base, id: 4, serie: null },
        { ...base, id: 5, serie: 'b', tipo: 'Examen', efecto: 'Prohibicion', fecha_inicio: '2026-11-04', fecha_fin: '2026-11-04' },
      ],
      '2026-11-04',
    )
    expect(series.map((s) => [s.serie, s.fechas, s.primera, s.ultima])).toEqual([
      ['b', 1, '2026-11-04', '2026-11-04'],
      ['a', 2, '2026-11-05', '2026-11-10'],
    ])
  })

  it('sin área verde, el alcance es todo el campus', () => {
    expect(textoAlcance(null)).toBe('Todo el campus')
    expect(textoAlcance(7)).toBe('Área verde 7')
  })
})
