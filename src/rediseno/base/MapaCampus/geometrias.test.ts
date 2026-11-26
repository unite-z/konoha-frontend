import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AreasVerdesGeoJSON } from '@/services/api/mapaInventario'
import type { DatosCampus } from '@/types/campus3d'
import { areaDeGeometria, calcularGeometriasVivas, obtenerGeometrias, reiniciarCacheGeometrias } from './geometrias'

const cargar = vi.fn()
vi.mock('@/services/api/mapaInventario', () => ({ cargarAreasVerdesGeoJSON: () => cargar() }))

// Proyección de 100 000 m por grado: 0,0001° = 10 m.
const proyeccion = { tipo: 'equirrectangular-local', origen_lon: 0, origen_lat: 0, kx: 100000, ky: 100000, unidad: 'm' }
const cuadrado = (x: number, y: number, lado: number) => [x, y, x + lado, y, x + lado, y + lado, x, y + lado]
const datos = {
  proyeccion,
  areas: [
    { id: 'estable', p: cuadrado(0, 0, 100), s: 10000 },
    { id: 'cambia', p: cuadrado(300, 0, 100), s: 10000 },
    { id: 'cambia', p: cuadrado(500, 0, 100), s: 10000 },
  ],
} as unknown as DatosCampus

const anillo = (x: number, y: number, lado: number) => {
  const p = cuadrado(x, y, lado)
  const pares = Array.from({ length: p.length / 2 }, (_, i) => [p[2 * i] / 100000, p[2 * i + 1] / 100000])
  return [...pares, pares[0]]
}
const feature = (mapa_id: string | null, x: number, y: number, lado: number, extra = {}) => ({
  type: 'Feature' as const,
  properties: { mapa_id, ...extra },
  geometry: { type: 'MultiPolygon' as const, coordinates: [[anillo(x, y, lado)]] },
})
const geojson = (...features: ReturnType<typeof feature>[]) =>
  ({ type: 'FeatureCollection', features }) as unknown as AreasVerdesGeoJSON

afterEach(() => {
  reiniciarCacheGeometrias()
  cargar.mockReset()
})

describe('calcularGeometriasVivas (AV-426)', () => {
  it('dibuja una geometría nueva y no toca el campus base', () => {
    const r = calcularGeometriasVivas(
      datos,
      geojson(feature('nueva', 700, 0, 50, { Nombre: 'Jardín nuevo', código: 'N 1' })),
    )
    expect(r.geometrias).toHaveLength(1)
    expect(r.geometrias[0]).toMatchObject({ id: 'nueva', cambiada: false, nombre: 'Jardín nuevo', codigo: 'N 1' })
    expect(r.geometrias[0].superficie).toBeCloseTo(2500, 0)
    expect(r.ocultar).toEqual([])
  })

  it('dibuja una geometría cambiada y oculta todas las partes de la antigua', () => {
    const r = calcularGeometriasVivas(datos, geojson(feature('cambia', 300, 0, 160)))
    expect(r.geometrias.map((g) => [g.id, g.cambiada])).toEqual([['cambia', true]])
    expect(r.ocultar).toEqual([1, 2])
  })

  it('ignora las que coinciden con el campus (con tolerancia) y las que no traen id', () => {
    const r = calcularGeometriasVivas(datos, geojson(feature('estable', 1, 0, 100), feature(null, 900, 0, 50)))
    expect(r.geometrias).toEqual([])
  })

  it('la geometría viva se convierte en un área del campus para seleccionarla igual', () => {
    const [g] = calcularGeometriasVivas(datos, geojson(feature('nueva', 700, 0, 50, { Nombre: 'Jardín' }))).geometrias
    expect(areaDeGeometria(g)).toMatchObject({ id: 'nueva', n: 'Jardín', s: 2500 })
  })

  it('con los datos reales del repositorio no hay nada nuevo ni cambiado', () => {
    const leer = (nombre: string) =>
      JSON.parse(readFileSync(resolve(__dirname, '../../../../public/datos', nombre), 'utf8'))
    const r = calcularGeometriasVivas(
      leer('campus-3d.json') as DatosCampus,
      leer('areas-verdes.geojson') as AreasVerdesGeoJSON,
    )
    expect(r.geometrias).toEqual([])
  })
})

describe('obtenerGeometrias (AV-426)', () => {
  it('hace una sola petición y la guarda en caché', async () => {
    cargar.mockResolvedValue(geojson())
    const [a, b] = await Promise.all([obtenerGeometrias(), obtenerGeometrias()])
    await obtenerGeometrias()
    expect(cargar).toHaveBeenCalledTimes(1)
    expect(a).toBe(b)
  })

  it('tras un error la siguiente llamada reintenta', async () => {
    cargar.mockRejectedValueOnce(new Error('caído')).mockResolvedValueOnce(geojson())
    await expect(obtenerGeometrias()).rejects.toThrow('caído')
    await expect(obtenerGeometrias()).resolves.toBeTruthy()
    expect(cargar).toHaveBeenCalledTimes(2)
  })
})
