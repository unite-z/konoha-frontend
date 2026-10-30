import { describe, expect, it } from 'vitest'
import { formatearMes } from './formato'

describe('formatearMes', () => {
  it.each([
    ['2026-10', 'oct. 2026'],
    ['2026-09', 'sept. 2026'],
    ['2026-13', '—'],
    ['', '—'],
    [null, '—'],
  ])('%j → %j', (mes, esperado) => {
    expect(formatearMes(mes)).toBe(esperado)
  })
})
