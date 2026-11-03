import { describe, expect, it } from 'vitest'
import { colocarEnSemana, desplazarMes, nombreMes, semanasDelMes } from './calendarioCronograma'

describe('calendario de la propuesta', () => {
  it('semanasDelMes empieza en lunes y rellena con huecos', () => {
    const semanas = semanasDelMes({ anio: 2026, mes: 11 }) // 1 de noviembre de 2026 es domingo
    expect(semanas[0]).toEqual([null, null, null, null, null, null, '2026-11-01'])
    expect(semanas.every((s) => s.length === 7)).toBe(true)
    expect(semanas.flat().filter(Boolean)).toHaveLength(30)
  })

  it('colocarEnSemana reparte en carriles sin solaparse y recorta a la semana', () => {
    const bloques = [
      { clave: 'a', desde: '2026-11-02', hasta: '2026-11-04' },
      { clave: 'b', desde: '2026-11-03', hasta: '2026-11-03' },
      { clave: 'c', desde: '2026-11-05', hasta: '2026-11-10' },
      { clave: 'd', desde: '2026-10-30', hasta: '2026-11-02' },
      { clave: 'fuera', desde: '2026-11-20', hasta: '2026-11-21' },
    ]
    const colocados = colocarEnSemana(bloques, '2026-11-02')
    const resumen = Object.fromEntries(colocados.map((c) => [c.bloque.clave, [c.columna, c.dias, c.carril, c.sigueAntes, c.sigueDespues]]))
    expect(resumen).toEqual({
      d: [0, 1, 0, true, false],
      a: [0, 3, 1, false, false],
      b: [1, 1, 0, false, false],
      c: [3, 4, 0, false, true],
    })
  })

  it('meses: desplazar cruza de año y el nombre es legible', () => {
    expect(desplazarMes({ anio: 2026, mes: 12 }, 1)).toEqual({ anio: 2027, mes: 1 })
    expect(nombreMes({ anio: 2026, mes: 11 })).toBe('noviembre de 2026')
  })
})
