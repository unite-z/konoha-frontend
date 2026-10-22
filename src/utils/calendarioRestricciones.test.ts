import { describe, expect, it } from 'vitest'
import type { Restriccion } from '../types/planificacion'
import { desplazarMes, mesDeFecha, nombreMes, ordenarRestricciones, rangoDelMes } from './calendarioRestricciones'

describe('meses', () => {
  it('calcula el rango, incluido febrero bisiesto', () => {
    expect(rangoDelMes({ anio: 2026, mes: 10 })).toEqual({ desde: '2026-10-01', hasta: '2026-10-31' })
    expect(rangoDelMes({ anio: 2028, mes: 2 })).toEqual({ desde: '2028-02-01', hasta: '2028-02-29' })
  })

  it('cruza de año al desplazar', () => {
    expect(desplazarMes({ anio: 2026, mes: 12 }, 1)).toEqual({ anio: 2027, mes: 1 })
    expect(desplazarMes({ anio: 2026, mes: 1 }, -1)).toEqual({ anio: 2025, mes: 12 })
  })

  it('lee el mes de una fecha y lo nombra', () => {
    expect(nombreMes(mesDeFecha('2026-10-22'))).toBe('octubre de 2026')
  })
})

describe('ordenarRestricciones', () => {
  const base = { tipo: '', efecto: 'Advertencia', tipo_restriccion_id: 1 } as unknown as Restriccion
  it('ordena por inicio sin mutar', () => {
    const entrada = [
      { ...base, id: 2, fecha_inicio: '2026-10-20', fecha_fin: '2026-10-21' },
      { ...base, id: 1, fecha_inicio: '2026-10-05', fecha_fin: '2026-10-06' },
    ]
    expect(ordenarRestricciones(entrada).map((r) => r.id)).toEqual([1, 2])
    expect(entrada[0].id).toBe(2)
  })
})
