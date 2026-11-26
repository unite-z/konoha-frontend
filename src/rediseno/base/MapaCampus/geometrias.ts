/**
 * Geometrías vivas (AV-426): compara `GET /inventario/mapa/geometria` con las huellas de `campus-3d.json` y deja las
 * áreas nuevas o cambiadas, ya proyectadas a metros. Las funciones puras se prueban sin red; la petición es una sola
 * por sesión y se guarda en caché.
 */
import { cargarAreasVerdesGeoJSON, type AreasVerdesGeoJSON } from '@/services/api/mapaInventario'
import type { AreaCampus, DatosCampus } from '@/types/campus3d'
import type { GeometriaViva } from './escena'
import { lonLatAMetros } from './proyeccion'

/**
 * Una huella se da por cambiada si su superficie varía más de esta fracción (y más de `TOLERANCIA_MINIMA_M2`: el
 * generador del campus descarta fragmentos de unos pocos m²) o su centro se mueve más de estos metros.
 */
export const TOLERANCIA_SUPERFICIE = 0.03
export const TOLERANCIA_MINIMA_M2 = 12
export const TOLERANCIA_CENTRO_M = 3

export interface GeometriaDetectada extends GeometriaViva {
  nombre: string | null
  codigo: string | null
  /** `true` si el área ya está en el campus base (se oculta su versión antigua); `false` si es nueva. */
  cambiada: boolean
  superficie: number
  centro: [number, number]
}

export interface ResultadoGeometrias {
  geometrias: GeometriaDetectada[]
  /** Posiciones en `datos.areas` (todas las partes) de las áreas cambiadas: se ocultan al dibujar la nueva. */
  ocultar: number[]
}

function superficieAnillo(p: readonly number[]): number {
  let suma = 0
  const n = p.length / 2
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    suma += p[2 * i] * p[2 * j + 1] - p[2 * j] * p[2 * i + 1]
  }
  return Math.abs(suma) / 2
}

function centroDe(anillos: readonly (readonly number[])[]): [number, number] {
  let x0 = Infinity
  let x1 = -Infinity
  let y0 = Infinity
  let y1 = -Infinity
  for (const p of anillos) {
    for (let i = 0; i < p.length; i += 2) {
      x0 = Math.min(x0, p[i])
      x1 = Math.max(x1, p[i])
      y0 = Math.min(y0, p[i + 1])
      y1 = Math.max(y1, p[i + 1])
    }
  }
  return [(x0 + x1) / 2, (y0 + y1) / 2]
}

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() !== '' ? valor : null
}

/** Anillos exteriores del GeoJSON en metros, sin el vértice de cierre repetido. */
function anillosDe(datos: DatosCampus, geometria: AreasVerdesGeoJSON['features'][number]['geometry']): number[][] {
  const poligonos: number[][][][] =
    (geometria.type as string) === 'Polygon'
      ? [geometria.coordinates as unknown as number[][][]]
      : geometria.coordinates
  return poligonos.flatMap((poligono) => {
    const exterior = poligono[0] ?? []
    const abierto =
      exterior.length > 1 &&
      exterior[0][0] === exterior[exterior.length - 1][0] &&
      exterior[0][1] === exterior[exterior.length - 1][1]
        ? exterior.slice(0, -1)
        : exterior
    const plano = abierto.flatMap(([lon, lat]) => {
      const { x, y } = lonLatAMetros(datos.proyeccion, lon, lat)
      return [x, y]
    })
    return plano.length >= 6 ? [plano] : []
  })
}

export function calcularGeometriasVivas(datos: DatosCampus, geojson: AreasVerdesGeoJSON): ResultadoGeometrias {
  const geometrias: GeometriaDetectada[] = []
  const ocultar: number[] = []
  const baseDe = new Map<string, number[]>()
  datos.areas.forEach((area, indice) => baseDe.set(area.id, [...(baseDe.get(area.id) ?? []), indice]))

  for (const feature of geojson.features) {
    const propiedades = feature.properties ?? {}
    const id =
      texto(propiedades.mapa_id) ?? texto(propiedades.id) ?? (feature.id === undefined ? null : String(feature.id))
    if (!id || !feature.geometry) continue
    const anillos = anillosDe(datos, feature.geometry)
    if (anillos.length === 0) continue
    const superficie = anillos.reduce((suma, p) => suma + superficieAnillo(p), 0)
    const centro = centroDe(anillos)
    const indices = baseDe.get(id)
    let cambiada = false
    if (indices) {
      const partes = indices.map((i) => datos.areas[i].p)
      const superficieBase = partes.reduce((suma, p) => suma + superficieAnillo(p), 0)
      const [cx, cy] = centroDe(partes)
      const igualSuperficie =
        Math.abs(superficie - superficieBase) <= Math.max(superficieBase * TOLERANCIA_SUPERFICIE, TOLERANCIA_MINIMA_M2)
      const igualCentro = Math.hypot(centro[0] - cx, centro[1] - cy) <= TOLERANCIA_CENTRO_M
      if (igualSuperficie && igualCentro) continue
      cambiada = true
      ocultar.push(...indices)
    }
    geometrias.push({
      id,
      anillos,
      nombre: texto(propiedades.Nombre) ?? texto(propiedades.nombre),
      codigo: texto(propiedades['código']) ?? texto(propiedades.codigo),
      cambiada,
      superficie,
      centro,
    })
  }
  return { geometrias, ocultar }
}

/** `AreaCampus` equivalente a una geometría viva, para que quien selecciona trate igual las del campus y las nuevas. */
export function areaDeGeometria(g: GeometriaDetectada): AreaCampus {
  return {
    id: g.id,
    n: g.nombre,
    c: g.codigo,
    s: Math.round(g.superficie),
    r: '',
    p: g.anillos[0],
    ct: g.centro,
  }
}

let peticion: Promise<AreasVerdesGeoJSON> | null = null

/** Una sola petición por sesión: las llamadas siguientes reutilizan la misma promesa. Si falla, la siguiente reintenta. */
export function obtenerGeometrias(): Promise<AreasVerdesGeoJSON> {
  peticion ??= cargarAreasVerdesGeoJSON().catch((causa: unknown) => {
    peticion = null
    throw causa
  })
  return peticion
}

export function reiniciarCacheGeometrias(): void {
  peticion = null
}
