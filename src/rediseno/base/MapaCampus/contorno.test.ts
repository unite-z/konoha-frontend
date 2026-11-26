import { describe, expect, it } from 'vitest'
import type { ProyeccionCampus } from '@/types/campus3d'
import { aGeoJSON, deGeoJSON, resultadoDe, seAutointersecta, superficieM2 } from './contorno'
import { lonLatAMetros, metrosALonLat } from './proyeccion'

const proy: ProyeccionCampus = {
  tipo: 'equirrectangular-local',
  origen_lon: -77.0805,
  origen_lat: -12.0695,
  kx: 108900,
  ky: 110574,
  unidad: 'm',
}
const cuadrado = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
]

describe('contorno (AV-428)', () => {
  it('calcula la superficie del cordón', () => {
    expect(superficieM2(cuadrado)).toBe(100)
    expect(superficieM2([...cuadrado].reverse())).toBe(100)
  })

  it('acepta polígonos simples y rechaza los que se cruzan', () => {
    expect(seAutointersecta(cuadrado, true)).toBe(false)
    const corbata = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 10, y: 0 },
      { x: 0, y: 10 },
    ]
    expect(seAutointersecta(corbata, true)).toBe(true)
    // Abierto aún no se cruza: lo hace el lado de cierre.
    expect(seAutointersecta(corbata.slice(0, 3), false)).toBe(false)
    expect(seAutointersecta(corbata, false)).toBe(true)
  })

  it('rechaza un lado que vuelve sobre el anterior y un vértice sobre otro lado', () => {
    expect(
      seAutointersecta(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 5, y: 0 },
        ],
        false,
      ),
    ).toBe(true)
    const tocando = [...cuadrado, { x: 5, y: 0 }, { x: 5, y: -5 }]
    expect(seAutointersecta(tocando, false)).toBe(true)
  })

  it('devuelve un anillo GeoJSON cerrado en [lon, lat]', () => {
    const { geojson, superficie_m2 } = resultadoDe(proy, cuadrado)
    const anillo = geojson.coordinates[0]
    expect(geojson.type).toBe('Polygon')
    expect(anillo).toHaveLength(5)
    expect(anillo[0]).toEqual(anillo[4])
    expect(anillo[0][0]).toBeCloseTo(proy.origen_lon, 6)
    expect(anillo[0][1]).toBeCloseTo(proy.origen_lat, 6)
    expect(superficie_m2).toBe(100)
  })

  it('ida y vuelta de los vértices con menos de 0,5 m de error', () => {
    const puntos = [
      { x: 123.456, y: -78.9 },
      { x: -250.25, y: 301.111 },
      { x: 400.9, y: 12.3 },
    ]
    const vuelta = deGeoJSON(proy, aGeoJSON(proy, puntos))
    puntos.forEach((p, i) => {
      expect(Math.hypot(vuelta[i].x - p.x, vuelta[i].y - p.y)).toBeLessThan(0.5)
    })
    const { lon, lat } = metrosALonLat(proy, 50, 60)
    const m = lonLatAMetros(proy, lon, lat)
    expect(Math.hypot(m.x - 50, m.y - 60)).toBeLessThan(0.001)
  })
})
