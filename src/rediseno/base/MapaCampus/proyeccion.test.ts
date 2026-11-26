import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { DatosCampus } from '@/types/campus3d'
import { escenaALonLat, lonLatAEscena, lonLatAMetros, metrosALonLat } from './proyeccion'

const datos = JSON.parse(readFileSync('public/datos/campus-3d.json', 'utf8')) as DatosCampus
const { proyeccion } = datos

/** Distancia en metros entre dos puntos lon/lat con la misma proyección local. */
function distancia(a: { lon: number; lat: number }, b: { lon: number; lat: number }): number {
  const p = lonLatAMetros(proyeccion, a.lon, a.lat)
  const q = lonLatAMetros(proyeccion, b.lon, b.lat)
  return Math.hypot(p.x - q.x, p.y - q.y)
}

describe('proyeccion (AV-424)', () => {
  // 20 puntos reales: el centro de las primeras áreas del campus, pasados a lon/lat con la proyección del JSON.
  const puntos = datos.areas
    .filter((a) => a.ct)
    .slice(0, 20)
    .map((a) => metrosALonLat(proyeccion, a.ct[0], a.ct[1]))

  it('usa 20 puntos reales del campus', () => {
    expect(puntos).toHaveLength(20)
    for (const p of puntos) {
      expect(Math.abs(p.lon - proyeccion.origen_lon)).toBeLessThan(0.01)
      expect(Math.abs(p.lat - proyeccion.origen_lat)).toBeLessThan(0.01)
    }
  })

  it('lon/lat → escena → lon/lat vuelve con menos de 0,5 m de error', () => {
    for (const p of puntos) {
      const vuelta = escenaALonLat(proyeccion, lonLatAEscena(proyeccion, p.lon, p.lat))
      expect(distancia(p, vuelta)).toBeLessThan(0.5)
    }
  })

  it('el origen cae en el centro de la escena y el norte apunta a -Z', () => {
    const origen = lonLatAEscena(proyeccion, proyeccion.origen_lon, proyeccion.origen_lat)
    expect(origen.x).toBeCloseTo(0)
    expect(origen.z).toBeCloseTo(0)
    expect(lonLatAEscena(proyeccion, proyeccion.origen_lon, proyeccion.origen_lat + 0.001).z).toBeCloseTo(
      -proyeccion.ky * 0.001,
    )
    expect(lonLatAEscena(proyeccion, proyeccion.origen_lon + 0.001, proyeccion.origen_lat).x).toBeCloseTo(
      proyeccion.kx * 0.001,
    )
  })
})
