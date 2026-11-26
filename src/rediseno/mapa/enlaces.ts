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
  /** Ejemplar con la ficha flotante abierta sobre el área (`&ejemplar=<id>`, RD-21). */
  ejemplar: 'ejemplar',
  /** `muerto`: la ficha abre en Situación con la propuesta de «planta muerta» lista para confirmar (RD-21, desde una intervención). */
  propuesta: 'propuesta',
  /** Área en edición (`&editar=1`); la edición la construye RD-19. */
  editar: 'editar',
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

/** Mapa con el área abierta y la ficha flotante del ejemplar encima (`?area=<id>&ejemplar=<id>`). */
export function rutaMapaEjemplar(areaId: number | string, ejemplarId: number | string): string {
  return `${rutaMapaArea(areaId)}&${PARAMETROS_MAPA.ejemplar}=${encodeURIComponent(String(ejemplarId))}`
}

/** Mapa con el área abierta en edición (`?area=<id>&editar=1`, RD-19). */
export function rutaMapaEditarArea(areaId: number | string): string {
  return `${rutaMapaArea(areaId)}&${PARAMETROS_MAPA.editar}=1`
}

/** Valor de `propuesta` que abre la confirmación de «planta muerta» en la ficha del ejemplar. */
export const PROPUESTA_PLANTA_MUERTA = 'muerto'

/** Mapa con la ficha del ejemplar abierta sobre su área y la propuesta de «planta muerta» por confirmar. */
export function rutaMapaEjemplarMuerto(areaId: number | string, ejemplarId: number | string): string {
  return `${rutaMapaEjemplar(areaId, ejemplarId)}&${PARAMETROS_MAPA.propuesta}=${PROPUESTA_PLANTA_MUERTA}`
}
