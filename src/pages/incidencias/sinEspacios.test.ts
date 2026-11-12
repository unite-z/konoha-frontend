import { describe, expect, it } from 'vitest'
import { MOTIVO_SIN_ESPACIOS, motivoSinEspacios } from './sinEspacios'

describe('motivoSinEspacios', () => {
  it('bloquea cuando el catálogo cargó sin espacios', () => {
    expect(motivoSinEspacios([])).toBe(MOTIVO_SIN_ESPACIOS)
  })

  it('no bloquea mientras carga ni cuando hay espacios', () => {
    expect(motivoSinEspacios(undefined)).toBeUndefined()
    expect(motivoSinEspacios([{ nombre: 'Jardín de la Biblioteca' }])).toBeUndefined()
  })
})
