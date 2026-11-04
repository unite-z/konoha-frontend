import { describe, expect, it } from 'vitest'
import type { Programacion } from '@/types/planificacion'
import { ciclosAfectados, diaIso, errorRepeticion, fechasDeRepeticion, textoRepeticion } from './nuevaRestriccion'

const ciclo: Programacion = {
  id: 1,
  tipo_servicio_id: 1,
  servicio: 'Corte de césped',
  proveedor_id: null,
  proveedor: null,
  estacion: 'Primavera',
  fecha_inicio_prevista: '2026-11-16',
  fecha_fin_prevista: '2026-11-19',
  estado: 'Programada',
  fecha_inicio_real: null,
  fecha_fin_real: null,
}

describe('nuevaRestriccion', () => {
  it('genera las fechas de los días elegidos, como el backend', () => {
    expect(diaIso('2026-11-05')).toBe(4)
    expect(fechasDeRepeticion('2026-11-05', '2026-12-31', [4])).toHaveLength(9)
    expect(textoRepeticion([4], 9)).toBe('Todos los jueves · 9 fechas')
    expect(textoRepeticion([1, 3], 18)).toBe('Lunes y miércoles · 18 fechas')
  })

  it('valida la repetición', () => {
    expect(errorRepeticion('2026-11-05', '2026-12-31', [])).toMatchObject({ campo: 'dias' })
    expect(errorRepeticion('2026-11-05', '', [4])).toMatchObject({ campo: 'hasta' })
    expect(errorRepeticion('2026-11-05', '2026-11-01', [4])).toMatchObject({ campo: 'hasta' })
    expect(errorRepeticion('2026-11-05', '2032-01-01', [1, 2, 3, 4, 5])?.mensaje).toMatch(/más de 200/)
    expect(errorRepeticion('2026-11-05', '2026-12-31', [4])).toBeUndefined()
  })

  it('lista los ciclos programados o en curso que coinciden con alguna fecha', () => {
    const otros = [ciclo, { ...ciclo, id: 2, estado: 'Completada' as const }, { ...ciclo, id: 3, tipo_servicio_id: 2 }]
    expect(ciclosAfectados(otros, ['2026-11-12', '2026-11-19'], 1, false, () => true).map((c) => c.id)).toEqual([1, 3])
    expect(ciclosAfectados(otros, ['2026-11-19'], 1, true, (id) => id === 1).map((c) => c.id)).toEqual([1])
    expect(ciclosAfectados(otros, ['2026-11-12'], 2, false, () => true)).toEqual([])
  })
})
