import { describe, expect, it } from 'vitest'
import type { DatosCampus } from '@/types/campus3d'
import { agruparMarcadores, resolverMarcador, type PuntoMarcador } from './marcadores'

const datos = {
  proyeccion: { tipo: 'equirrectangular-local', origen_lon: -77, origen_lat: -12, kx: 100000, ky: 100000, unidad: 'm' },
  areas: [{ id: 'a', n: 'Arboleda', c: null, s: 1, r: '', p: [], ct: [10, 20] }],
} as unknown as DatosCampus

const punto = (id: string, x: number, y: number): PuntoMarcador => ({ marcador: { id, etiqueta: id }, x, y })

describe('resolverMarcador (AV-426)', () => {
  it('por lon/lat usa la proyección del campus', () => {
    const p = resolverMarcador(datos, { id: 'm', etiqueta: 'm', lon: -76.99, lat: -11.99 })
    expect(p?.x).toBeCloseTo(1000, 3)
    expect(p?.y).toBeCloseTo(1000, 3)
  })

  it('por área usa el centro publicado y descarta las áreas desconocidas', () => {
    expect(resolverMarcador(datos, { id: 'm', etiqueta: 'm', areaId: 'a' })).toMatchObject({ x: 10, y: 20 })
    expect(resolverMarcador(datos, { id: 'm', etiqueta: 'm', areaId: 'zzz' })).toBeNull()
    expect(resolverMarcador(datos, { id: 'm', etiqueta: 'm' })).toBeNull()
  })
})

describe('agruparMarcadores (AV-426)', () => {
  it('agrupa los que se solapan y deja aparte los lejanos', () => {
    const grupos = agruparMarcadores([punto('a', 0, 0), punto('b', 5, 0), punto('c', 100, 100)], 10)
    expect(grupos).toHaveLength(2)
    expect(grupos[0].marcadores.map((m) => m.id)).toEqual(['a', 'b'])
    expect(grupos[0].x).toBeCloseTo(2.5)
    expect(grupos[0].clave).toBe('a|b')
    expect(grupos[1].clave).toBe('c')
    expect(grupos[0].dispersion).toBeCloseTo(2.5)
    expect(grupos[1].dispersion).toBe(0)
  })

  it('con menos radio (más zoom) se separan', () => {
    expect(agruparMarcadores([punto('a', 0, 0), punto('b', 5, 0)], 2)).toHaveLength(2)
  })

  it('la clave no depende del orden de entrada', () => {
    const a = agruparMarcadores([punto('a', 0, 0), punto('b', 1, 0)], 10)[0].clave
    const b = agruparMarcadores([punto('b', 1, 0), punto('a', 0, 0)], 10)[0].clave
    expect(a).toBe(b)
  })
})
