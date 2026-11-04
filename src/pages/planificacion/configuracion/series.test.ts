import { describe, expect, it } from 'vitest'
import type { Restriccion } from '@/types/planificacion'
import { agruparSeries, textoAlcance, textoFechasSerie } from './series'

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

describe('series (Figma 366-3687)', () => {
  it('agrupa por serie las fechas de hoy en adelante y deja las sueltas en su propia fila', () => {
    const series = agruparSeries(
      [
        base,
        { ...base, id: 2, fecha_inicio: '2026-11-05', fecha_fin: '2026-11-05' },
        { ...base, id: 3, fecha_inicio: '2026-11-12', fecha_fin: '2026-11-12' },
        { ...base, id: 4, serie: null, fecha_inicio: '2026-11-15', fecha_fin: '2026-11-15' },
        { ...base, id: 5, serie: 'b', tipo: 'Examen', efecto: 'Prohibicion', fecha_inicio: '2026-11-04', fecha_fin: '2026-11-04' },
      ],
      '2026-11-04',
    )
    expect(series.map((s) => [s.clave, s.fechas, s.primera, s.ultima])).toEqual([
      ['b', 1, '2026-11-04', '2026-11-04'],
      ['a', 2, '2026-11-05', '2026-11-12'],
      ['r-4', 1, '2026-11-15', '2026-11-15'],
    ])
  })

  it('escribe las fechas y el alcance como en Figma', () => {
    const [jueves, suelta, varios] = agruparSeries(
      [
        { ...base, fecha_inicio: '2026-11-05', fecha_fin: '2026-11-05' },
        { ...base, id: 2, fecha_inicio: '2026-12-31', fecha_fin: '2026-12-31' },
        { ...base, id: 3, serie: null, fecha_inicio: '2026-11-15', fecha_fin: '2026-11-15' },
        { ...base, id: 4, serie: null, fecha_inicio: '2026-11-23', fecha_fin: '2026-11-28', aplica_servicios_ruidosos: false, area_verde_id: 7 },
      ],
      '2026-11-04',
    )
    expect([textoFechasSerie(jueves), textoFechasSerie(suelta), textoFechasSerie(varios)]).toEqual(['Cada jueves · hasta 31/12', '15/11', '23 al 28/11'])
    expect([textoAlcance(jueves), textoAlcance(varios)]).toEqual(['Ruidosos · todo el campus', 'Todos · área verde 7'])
  })
})
