import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { DatosCampus } from '@/types/campus3d'
import { escenaALonLat, lonLatAEscena } from './proyeccion'

const datos = JSON.parse(readFileSync('public/datos/campus-3d.json', 'utf8')) as DatosCampus
const { proyeccion } = datos

// 20 puntos reales: vértices del perímetro del campus en OpenStreetMap (fuente del generador, en lon/lat).
const fuente = JSON.parse(readFileSync('scripts/campus-3d/datos/campus.json', 'utf8')) as {
  elements: Array<{ geometry: Array<{ lon: number; lat: number }> }>
}
const vertices = fuente.elements[0].geometry
const puntos = Array.from({ length: 20 }, (_, i) => vertices[Math.floor((i * (vertices.length - 1)) / 20)])

/** Distancia en metros sobre la esfera (haversine), independiente de la proyección que se prueba. */
function metrosEntre(a: { lon: number; lat: number }, b: { lon: number; lat: number }): number {
  const rad = Math.PI / 180
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lon - a.lon) * rad) / 2) ** 2
  return 2 * 6371008.8 * Math.asin(Math.sqrt(h))
}

/** Distancia de un punto de la escena al perímetro publicado en el JSON (en metros, con z = -y). */
function distanciaAlPerimetro(x: number, z: number): number {
  const p = datos.campus
  let minima = Infinity
  for (let i = 0; i < p.length; i += 2) {
    const j = (i + 2) % p.length
    const [ax, az, bx, bz] = [p[i], -p[i + 1], p[j], -p[j + 1]]
    const largo = (bx - ax) ** 2 + (bz - az) ** 2
    const t = largo ? Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / largo)) : 0
    minima = Math.min(minima, Math.hypot(x - ax - t * (bx - ax), z - az - t * (bz - az)))
  }
  return minima
}

describe('proyeccion (AV-424)', () => {
  it('lon/lat → escena → lon/lat vuelve con menos de 0,5 m de error en 20 puntos reales', () => {
    expect(new Set(puntos).size).toBe(20)
    for (const p of puntos) {
      const vuelta = escenaALonLat(proyeccion, lonLatAEscena(proyeccion, p.lon, p.lat))
      expect(metrosEntre(p, vuelta)).toBeLessThan(0.5)
    }
  })

  it('coincide con la geometría del JSON: cada punto real cae sobre el perímetro publicado', () => {
    // El generador simplifica el perímetro con una tolerancia de 0,5 m y redondea a 0,1 m.
    for (const p of puntos) {
      const { x, z } = lonLatAEscena(proyeccion, p.lon, p.lat)
      expect(distanciaAlPerimetro(x, z)).toBeLessThan(0.6)
    }
  })

  it('el origen cae en el centro de la escena y el norte apunta a -Z', () => {
    const origen = lonLatAEscena(proyeccion, proyeccion.origen_lon, proyeccion.origen_lat)
    expect(origen.x).toBeCloseTo(0)
    expect(origen.z).toBeCloseTo(0)
    expect(lonLatAEscena(proyeccion, proyeccion.origen_lon, proyeccion.origen_lat + 0.001).z).toBeLessThan(0)
    expect(lonLatAEscena(proyeccion, proyeccion.origen_lon + 0.001, proyeccion.origen_lat).x).toBeGreaterThan(0)
  })
})
