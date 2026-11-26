/**
 * Proyección lon/lat ↔ escena (AV-424). El JSON del campus trae un bloque `proyeccion` equirrectangular local: metros
 * al este (x) y al norte (y) desde el origen. En la escena de Three.js, X = x, Y = arriba y Z = -y.
 */
import type { ProyeccionCampus } from '@/types/campus3d'

export interface PuntoEscena {
  x: number
  z: number
}

export function lonLatAMetros(proy: ProyeccionCampus, lon: number, lat: number): { x: number; y: number } {
  return { x: (lon - proy.origen_lon) * proy.kx, y: (lat - proy.origen_lat) * proy.ky }
}

export function metrosALonLat(proy: ProyeccionCampus, x: number, y: number): { lon: number; lat: number } {
  return { lon: proy.origen_lon + x / proy.kx, lat: proy.origen_lat + y / proy.ky }
}

export function lonLatAEscena(proy: ProyeccionCampus, lon: number, lat: number): PuntoEscena {
  const { x, y } = lonLatAMetros(proy, lon, lat)
  return { x, z: -y }
}

export function escenaALonLat(proy: ProyeccionCampus, punto: PuntoEscena): { lon: number; lat: number } {
  return metrosALonLat(proy, punto.x, -punto.z)
}
