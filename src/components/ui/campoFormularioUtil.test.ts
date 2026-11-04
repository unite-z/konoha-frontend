import { describe, expect, it } from 'vitest'
import { filtrarNumero } from './campoFormularioUtil'

describe('filtrarNumero', () => {
  it('entero: solo dígitos', () => {
    expect(filtrarNumero('3a0 días', 'entero')).toBe('30')
    expect(filtrarNumero('-12', 'entero')).toBe('12')
    expect(filtrarNumero('-12', 'entero', { negativo: true })).toBe('-12')
  })

  it('decimal: un solo separador, coma o punto, y espacios de miles', () => {
    expect(filtrarNumero('12 000,50 soles', 'decimal')).toBe('12 000,50')
    expect(filtrarNumero('2.5.3', 'decimal')).toBe('2.53')
    expect(filtrarNumero('1,2345', 'decimal', { decimales: 2 })).toBe('1,23')
    expect(filtrarNumero('-12.0345', 'decimal', { negativo: true })).toBe('-12.0345')
  })
})
