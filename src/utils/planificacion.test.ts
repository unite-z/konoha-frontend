import { describe, expect, it } from 'vitest'
import { horaCorta, textoHorario } from './planificacion'

describe('horaCorta', () => {
  it('quita los segundos', () => {
    expect(horaCorta('06:00:00')).toBe('06:00')
    expect(horaCorta(null)).toBeNull()
  })
})

describe('textoHorario', () => {
  it('cubre los casos', () => {
    expect(textoHorario('08:00', '12:00')).toBe('08:00 a 12:00')
    expect(textoHorario('08:00:00', null)).toBe('Desde 08:00')
    expect(textoHorario(null, '12:00')).toBe('Hasta 12:00')
    expect(textoHorario(null, null)).toBe('—')
  })
})
