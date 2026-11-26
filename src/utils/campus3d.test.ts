/// <reference types="node" />
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Proyeccion {
  tipo: string
  origen_lon: number
  origen_lat: number
  kx: number
  ky: number
  unidad: string
}

interface AreaCampus {
  id: string
  n: string | null
  c: string | null
  s: number
  r: string | null
  p: number[]
  ct?: [number, number]
  h?: string
}

interface Edificio {
  p: number[]
  h: number
  b: number
}

interface DatosCampus3d {
  atribucion: string
  proyeccion: Proyeccion
  campus: number[]
  edificios: Edificio[]
  cesped: number[][]
  canchas: number[][]
  agua: number[][]
  vias: number[][]
  senderos: number[][]
  areas: AreaCampus[]
  arboles: number[][]
  etiquetas: [string, number, number][]
}

const leer = (nombre: string): string => readFileSync(resolve(process.cwd(), 'public/datos', nombre), 'utf-8')
const datos = JSON.parse(leer('campus-3d.json')) as DatosCampus3d

function aMetros(py: Proyeccion, lon: number, lat: number): [number, number] {
  return [(lon - py.origen_lon) * py.kx, (lat - py.origen_lat) * py.ky]
}

describe('campus-3d.json', () => {
  it('tiene todas las claves del contrato', () => {
    for (const clave of [
      'atribucion',
      'proyeccion',
      'campus',
      'edificios',
      'cesped',
      'canchas',
      'agua',
      'vias',
      'senderos',
      'areas',
      'arboles',
      'etiquetas',
    ]) {
      expect(datos).toHaveProperty(clave)
    }
    expect(datos.atribucion).toBe('© OpenStreetMap contributors · OpenFreeMap')
  })

  it('trae las capas con datos', () => {
    expect(datos.areas.length).toBeGreaterThan(500)
    expect(datos.arboles.length).toBeGreaterThan(1000)
    expect(datos.edificios.length).toBeGreaterThan(50)
    expect(datos.campus.length).toBeGreaterThan(8)
    expect(datos.vias.length).toBeGreaterThan(0)
    expect(datos.senderos.length).toBeGreaterThan(0)
    for (const e of datos.edificios) {
      expect(e.h).toBeGreaterThan(e.b)
      expect(e.p.length % 2).toBe(0)
    }
  })

  it('cada área tiene identificador y su primera entrada lleva centro y huella', () => {
    const vistas = new Set<string>()
    for (const a of datos.areas) {
      expect(a.id).toBeTruthy()
      if (vistas.has(a.id)) {
        expect(a.ct).toBeUndefined()
        continue
      }
      vistas.add(a.id)
      expect(a.ct).toHaveLength(2)
      expect(a.h).toMatch(/^[0-9a-f]{8}$/)
    }
    expect(vistas.size).toBe(521)
  })

  it('publica una proyección completa', () => {
    const py = datos.proyeccion
    expect(py.unidad).toBe('m')
    expect(py.kx).toBeGreaterThan(100000)
    expect(py.ky).toBeGreaterThan(100000)
    expect(py.origen_lat).toBeLessThan(-12)
    expect(py.origen_lon).toBeLessThan(-77)
  })

  it('el centro publicado de cada área cae dentro de su caja envolvente', () => {
    for (const a of datos.areas.filter((x) => x.ct)) {
      const [cx, cy] = a.ct ?? [0, 0]
      const todos = datos.areas.filter((x) => x.id === a.id).flatMap((x) => x.p)
      const xs = todos.filter((_, k) => k % 2 === 0)
      const ys = todos.filter((_, k) => k % 2 === 1)
      expect(cx).toBeGreaterThanOrEqual(Math.min(...xs) - 1)
      expect(cx).toBeLessThanOrEqual(Math.max(...xs) + 1)
      expect(cy).toBeGreaterThanOrEqual(Math.min(...ys) - 1)
      expect(cy).toBeLessThanOrEqual(Math.max(...ys) + 1)
    }
  })

  it('proyectar el primer vértice de 40 áreas del GeoJSON cae sobre su contorno publicado', () => {
    const py = datos.proyeccion
    const geo = JSON.parse(leer('areas-verdes.geojson')) as {
      features: { properties: { mapa_id: string }; geometry: { coordinates: number[][][][] } }[]
    }
    for (const f of geo.features.slice(0, 40)) {
      const [lon, lat] = f.geometry.coordinates[0][0][0]
      const [x, y] = aMetros(py, lon, lat)
      const p = datos.areas.find((a) => a.id === f.properties.mapa_id)?.p ?? []
      let minimo = Infinity
      for (let i = 0; i < p.length; i += 2) minimo = Math.min(minimo, Math.hypot(p[i] - x, p[i + 1] - y))
      expect(minimo).toBeLessThan(0.5)
    }
  })
})
