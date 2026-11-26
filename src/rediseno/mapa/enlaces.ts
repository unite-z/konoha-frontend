import { PREFIJO_REDISENO } from '../prefijo'

export const SEGMENTO_MAPA = 'mapa'
export const RUTA_MAPA = `${PREFIJO_REDISENO}/${SEGMENTO_MAPA}`

/** Parámetros de la URL de Mapa: búsqueda, filtros, página y el área o contorno abierto. */
export const PARAMETROS_MAPA = {
  busqueda: 'q',
  sector: 'sector',
  uso: 'uso',
  cuartel: 'cuartel',
  pagina: 'pagina',
  area: 'area',
  poligono: 'poligono',
  /** Alta de área (`1`); la redirección de `/areas-verdes/nueva` (AV-425) lo pone. */
  registrar: 'registrar',
} as const

export function rutaMapa(): string {
  return RUTA_MAPA
}

/** Mapa con el área de inventario abierta (`?area=<id>`). */
export function rutaMapaArea(areaId: number | string): string {
  return `${RUTA_MAPA}?${PARAMETROS_MAPA.area}=${encodeURIComponent(String(areaId))}`
}

/** Mapa con un contorno abierto (`?poligono=<mapa_id>`), esté o no vinculado a un área. */
export function rutaMapaPoligono(mapaId: string): string {
  return `${RUTA_MAPA}?${PARAMETROS_MAPA.poligono}=${encodeURIComponent(mapaId)}`
}

/** Mapa con el alta de área abierta (`?registrar=1`). */
export function rutaMapaRegistrar(): string {
  return `${RUTA_MAPA}?${PARAMETROS_MAPA.registrar}=1`
}
