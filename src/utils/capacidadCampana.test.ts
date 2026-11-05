import { describe, expect, it } from 'vitest'
import { calcularCapacidad, diasDelPeriodo, finSugerido } from './capacidadCampana'

describe('diasDelPeriodo', () => {
  it('cuenta el inicio y el fin', () => {
    expect(diasDelPeriodo('2026-12-20', '2026-12-20')).toBe(1)
    expect(diasDelPeriodo('2026-12-20', '2026-12-29')).toBe(10)
  })

  it('cruza el cambio de año', () => {
    expect(diasDelPeriodo('2026-12-28', '2027-01-06')).toBe(10)
  })

  it('devuelve null sin fechas o con el fin antes del inicio', () => {
    expect(diasDelPeriodo('', '2026-12-29')).toBeNull()
    expect(diasDelPeriodo('2026-12-29', '2026-12-20')).toBeNull()
  })
})

describe('calcularCapacidad', () => {
  it('marca como excedida una lista por encima de la capacidad', () => {
    expect(calcularCapacidad('2026-12-20', '2026-12-29', 12, 220)).toEqual({
      dias: 10,
      estimada: 120,
      requerido_por_dia: '22.00',
      excedida: true,
    })
  })

  it('no excede si la lista es igual a la capacidad', () => {
    expect(calcularCapacidad('2026-12-20', '2026-12-29', 12, 120)?.excedida).toBe(false)
  })

  it('no calcula con un objetivo no válido', () => {
    expect(calcularCapacidad('2026-12-20', '2026-12-29', 0, 10)).toBeNull()
    expect(calcularCapacidad('2026-12-20', '2026-12-29', 1.5, 10)).toBeNull()
  })
})

describe('finSugerido', () => {
  it('propone el máximo de días desde el inicio', () => {
    expect(finSugerido('2026-12-20', '2027-01-19', 10)).toBe('2026-12-29')
  })

  it('no pasa del fin del cierre', () => {
    expect(finSugerido('2027-01-15', '2027-01-19', 10)).toBe('2027-01-19')
  })
})
