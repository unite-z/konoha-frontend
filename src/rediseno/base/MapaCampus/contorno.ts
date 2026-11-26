/**
 * Lógica pura de la herramienta de contorno (AV-428): geometría en metros locales (x = este, y = norte) y paso a
 * GeoJSON en EPSG:4326 con la proyección reversible del campus (`proyeccion.ts`).
 */
import type { ProyeccionCampus } from '@/types/campus3d'
import { lonLatAMetros, metrosALonLat } from './proyeccion'

export interface Vertice {
  x: number
  y: number
}

export interface PoligonoGeoJSON {
  type: 'Polygon'
  /** Un solo anillo, cerrado (el último punto repite el primero), en [lon, lat]. */
  coordinates: number[][][]
}

export interface ResultadoContorno {
  geojson: PoligonoGeoJSON
  /** Superficie aproximada en m². */
  superficie_m2: number
}

/** Decimales de lon/lat: 7 son ~1 cm, muy por debajo del error de 0,5 m que se exige a la ida y vuelta. */
const DECIMALES = 7

const cruz = (o: Vertice, a: Vertice, b: Vertice) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)

/** Dos segmentos se cruzan (o se tocan) en un punto que no es un extremo compartido. */
function seCortan(a: Vertice, b: Vertice, c: Vertice, d: Vertice): boolean {
  const d1 = cruz(c, d, a)
  const d2 = cruz(c, d, b)
  const d3 = cruz(a, b, c)
  const d4 = cruz(a, b, d)
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true
  const encima = (p: Vertice, q: Vertice, r: Vertice) =>
    Math.min(p.x, q.x) <= r.x && r.x <= Math.max(p.x, q.x) && Math.min(p.y, q.y) <= r.y && r.y <= Math.max(p.y, q.y)
  return (
    (d1 === 0 && encima(c, d, a)) ||
    (d2 === 0 && encima(c, d, b)) ||
    (d3 === 0 && encima(a, b, c)) ||
    (d4 === 0 && encima(a, b, d))
  )
}

/**
 * `true` si el contorno se cruza a sí mismo. Con `cerrado` también cuenta el lado que une el último vértice con el
 * primero. Los lados contiguos solo comparten su extremo; un vértice repetido o encima de otro lado también cuenta.
 */
export function seAutointersecta(vertices: readonly Vertice[], cerrado: boolean): boolean {
  const n = vertices.length
  const lados = cerrado ? n : n - 1
  for (let i = 0; i < lados; i++) {
    const a = vertices[i]
    const b = vertices[(i + 1) % n]
    for (let j = i + 1; j < lados; j++) {
      const c = vertices[j]
      const d = vertices[(j + 1) % n]
      if (j === i + 1) {
        // Contiguos: solo es un cruce si el siguiente lado vuelve sobre el anterior (colineales y solapados).
        if (cruz(a, b, d) === 0 && (d.x - b.x) * (a.x - b.x) + (d.y - b.y) * (a.y - b.y) > 0) return true
        continue
      }
      if (cerrado && i === 0 && j === lados - 1) {
        if (cruz(c, d, b) === 0 && (b.x - a.x) * (c.x - a.x) + (b.y - a.y) * (c.y - a.y) > 0) return true
        continue
      }
      if (seCortan(a, b, c, d)) return true
    }
  }
  return false
}

/** Superficie (m²) por la fórmula del cordón. */
export function superficieM2(vertices: readonly Vertice[]): number {
  let suma = 0
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i]
    const b = vertices[(i + 1) % vertices.length]
    suma += a.x * b.y - b.x * a.y
  }
  return Math.abs(suma) / 2
}

const redondear = (valor: number) => Number(valor.toFixed(DECIMALES))

export function aGeoJSON(proyeccion: ProyeccionCampus, vertices: readonly Vertice[]): PoligonoGeoJSON {
  const anillo = vertices.map((v) => {
    const { lon, lat } = metrosALonLat(proyeccion, v.x, v.y)
    return [redondear(lon), redondear(lat)]
  })
  return { type: 'Polygon', coordinates: [[...anillo, anillo[0]]] }
}

/** Vértices (metros) de un GeoJSON de la herramienta, sin el punto de cierre repetido. */
export function deGeoJSON(proyeccion: ProyeccionCampus, poligono: PoligonoGeoJSON): Vertice[] {
  const anillo = poligono.coordinates[0] ?? []
  const abierto = anillo.length > 1 ? anillo.slice(0, -1) : anillo
  return abierto.map(([lon, lat]) => lonLatAMetros(proyeccion, lon, lat))
}

export function resultadoDe(proyeccion: ProyeccionCampus, vertices: readonly Vertice[]): ResultadoContorno {
  return { geojson: aGeoJSON(proyeccion, vertices), superficie_m2: Math.round(superficieM2(vertices) * 10) / 10 }
}

/** Distancia (m) entre dos puntos. */
export const distancia = (a: Vertice, b: Vertice) => Math.hypot(a.x - b.x, a.y - b.y)
