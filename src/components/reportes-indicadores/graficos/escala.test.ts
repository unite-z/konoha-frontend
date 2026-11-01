import { describe, expect, it } from 'vitest'
import { escalaRedonda, fechaCorta, marcasEje, porcentaje } from './escala'

describe('escalaRedonda', () => {
  it('redondea a cuatro pasos limpios', () => {
    expect(escalaRedonda(0)).toBe(0)
    expect(escalaRedonda(37)).toBe(40)
    expect(escalaRedonda(130)).toBe(200)
    expect(escalaRedonda(0.6)).toBe(0.8)
  })

  it('usa pasos enteros en los conteos y horas en los minutos', () => {
    expect(escalaRedonda(3, { enteros: true })).toBe(4)
    expect(escalaRedonda(400, { minutos: true })).toBe(8 * 60)
    expect(escalaRedonda(45, { minutos: true })).toBe(80)
  })
})

describe('marcas y barras', () => {
  it('da las cinco marcas del eje', () => {
    expect(marcasEje(40, (v) => String(v))).toEqual(['0', '10', '20', '30', '40'])
  })

  it('limita el largo de la barra a 0–100', () => {
    expect(porcentaje(10, 40)).toBe(25)
    expect(porcentaje(80, 40)).toBe(100)
    expect(porcentaje(null, 40)).toBe(0)
    expect(porcentaje(5, 0)).toBe(0)
  })

  it('acorta la fecha', () => {
    expect(fechaCorta('2026-10-20')).toBe('20 oct.')
  })
})
