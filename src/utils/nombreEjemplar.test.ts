import { describe, expect, it } from 'vitest'
import { nombreEjemplar } from './nombreEjemplar'

describe('nombreEjemplar', () => {
  it('antepone el alias al código', () => {
    expect(nombreEjemplar('EJ-00733', 'Robertito')).toBe('Robertito (EJ-00733)')
  })

  it('devuelve solo el código sin alias', () => {
    expect(nombreEjemplar('EJ-00733')).toBe('EJ-00733')
    expect(nombreEjemplar('EJ-00733', null)).toBe('EJ-00733')
  })

  it('ignora un alias vacío o de solo espacios', () => {
    expect(nombreEjemplar('EJ-00733', '')).toBe('EJ-00733')
    expect(nombreEjemplar('EJ-00733', '   ')).toBe('EJ-00733')
  })
})
