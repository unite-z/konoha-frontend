import type { DatosCampus } from '@/types/campus3d'
import { lonLatAMetros } from './proyeccion'

export type TonoMarcador = 'neutro' | 'info' | 'exito' | 'aviso' | 'error'

/** Un marcador va por lon/lat o por área (su centro publicado en `campus-3d.json`). */
export interface MarcadorMapa {
  id: string
  /** Nombre accesible del botón. */
  etiqueta: string
  lon?: number
  lat?: number
  areaId?: string
  tono?: TonoMarcador
}

export interface PuntoMarcador {
  marcador: MarcadorMapa
  x: number
  y: number
}

export interface GrupoMarcadores {
  /** Estable mientras no cambien los miembros: sirve de clave de React. */
  clave: string
  x: number
  y: number
  marcadores: MarcadorMapa[]
}

/** Posición en metros del marcador, o `null` si no se puede resolver (área desconocida o sin coordenadas). */
export function resolverMarcador(datos: DatosCampus, marcador: MarcadorMapa): PuntoMarcador | null {
  if (marcador.lon !== undefined && marcador.lat !== undefined) {
    const { x, y } = lonLatAMetros(datos.proyeccion, marcador.lon, marcador.lat)
    return { marcador, x, y }
  }
  const centro = marcador.areaId === undefined ? undefined : datos.areas.find((a) => a.id === marcador.areaId)?.ct
  return centro ? { marcador, x: centro[0], y: centro[1] } : null
}

/**
 * Agrupa los puntos que quedan a menos de `radio` metros del centro del grupo (a la escala actual, `radio` equivale a
 * unos píxeles). Es voraz y estable: el mismo orden de entrada da los mismos grupos.
 */
export function agruparMarcadores(puntos: readonly PuntoMarcador[], radio: number): GrupoMarcadores[] {
  const grupos: Array<{ x: number; y: number; puntos: PuntoMarcador[] }> = []
  for (const punto of puntos) {
    const cerca = grupos.find((g) => Math.hypot(g.x - punto.x, g.y - punto.y) <= radio)
    if (!cerca) {
      grupos.push({ x: punto.x, y: punto.y, puntos: [punto] })
      continue
    }
    cerca.puntos.push(punto)
    cerca.x = cerca.puntos.reduce((suma, p) => suma + p.x, 0) / cerca.puntos.length
    cerca.y = cerca.puntos.reduce((suma, p) => suma + p.y, 0) / cerca.puntos.length
  }
  return grupos.map((g) => ({
    clave: g.puntos
      .map((p) => p.marcador.id)
      .sort()
      .join('|'),
    x: g.x,
    y: g.y,
    marcadores: g.puntos.map((p) => p.marcador),
  }))
}
