/**
 * Lógica pura del mapa de atenciones (RF-REP-007 · CU-MOD06-003): validación de geometrías GeoJSON, filas de la
 * lista (A1: lo que no se dibuja se encuentra en la lista), encuadre, filtros de la URL y textos accesibles.
 * Sin dependencias de MapLibre ni de React, para poder probarla.
 */
import type {
  AtencionMapa,
  ConsultaMapa,
  ElementoGeoJson,
  GeometriaAtencion,
  ResultadoMapaAtenciones,
  TipoAtencion,
} from '../types/reportesGestion'
import { formatearFecha } from './formato'
import { aConsultaGestion, TIPOS_ATENCION } from './reportesGestion'

type Posicion = [number, number]

/** Elemento dibujable: su geometría ya se comprobó. */
export interface ElementoDibujable extends ElementoGeoJson {
  geometry: GeometriaAtencion
}

function esPosicion(valor: unknown): valor is Posicion {
  return (
    Array.isArray(valor) &&
    valor.length >= 2 &&
    typeof valor[0] === 'number' &&
    typeof valor[1] === 'number' &&
    Number.isFinite(valor[0]) &&
    Number.isFinite(valor[1]) &&
    valor[0] >= -180 &&
    valor[0] <= 180 &&
    valor[1] >= -90 &&
    valor[1] <= 90
  )
}

/** Anillo de un polígono: al menos 4 posiciones válidas (RFC 7946). */
function esAnillo(valor: unknown): boolean {
  return Array.isArray(valor) && valor.length >= 4 && valor.every(esPosicion)
}

function esPoligono(valor: unknown): boolean {
  return Array.isArray(valor) && valor.length > 0 && valor.every(esAnillo)
}

/** Guarda de tipo: Point, Polygon o MultiPolygon con coordenadas numéricas en rango ([-180,180], [-90,90]). */
export function esGeometriaValida(g: unknown): g is GeometriaAtencion {
  if (!g || typeof g !== 'object') return false
  const { type, coordinates } = g as { type?: unknown; coordinates?: unknown }
  switch (type) {
    case 'Point':
      return esPosicion(coordinates)
    case 'Polygon':
      return esPoligono(coordinates)
    case 'MultiPolygon':
      return Array.isArray(coordinates) && coordinates.length > 0 && coordinates.every(esPoligono)
    default:
      return false
  }
}

/** Fila de la lista: una por destino del alcance; `con_ubicacion` indica si se dibuja en el mapa. */
export interface FilaMapa extends AtencionMapa {
  clave: string
  con_ubicacion: boolean
}

/** Clave estable y única por fila: una atención se repite por cada espacio o ejemplar de su alcance. */
export function claveFilaMapa(a: AtencionMapa): string {
  return `${a.atencion_id}-${a.area_verde_id ?? 'sin'}-${a.ejemplar_id ?? 'sin'}`
}

/**
 * Elementos dibujables (geometría válida) y filas de la lista: primero los del mapa y después `sin_coordenadas`,
 * en el orden del back-end. Una geometría no válida no se dibuja, pero su atención queda en la lista (A1).
 */
export function prepararMapa(datos: ResultadoMapaAtenciones): { elementos: ElementoDibujable[]; filas: FilaMapa[] } {
  const elementos: ElementoDibujable[] = []
  const filas: FilaMapa[] = []
  for (const elemento of datos.mapa.features) {
    const { geometry, properties } = elemento
    const valida = esGeometriaValida(geometry)
    if (valida) elementos.push({ ...elemento, geometry })
    filas.push({ ...properties, clave: claveFilaMapa(properties), con_ubicacion: valida })
  }
  for (const atencion of datos.sin_coordenadas) {
    filas.push({ ...atencion, clave: claveFilaMapa(atencion), con_ubicacion: false })
  }
  return { elementos, filas }
}

/** Todas las posiciones de una geometría. */
function posiciones(g: GeometriaAtencion): Posicion[] {
  switch (g.type) {
    case 'Point':
      return [g.coordinates]
    case 'Polygon':
      return g.coordinates.flat()
    case 'MultiPolygon':
      return g.coordinates.flat(2)
  }
}

export type Limites = [[number, number], [number, number]]

function caja(lista: Posicion[]): Limites | null {
  if (lista.length === 0) return null
  let [oeste, sur] = lista[0]
  let [este, norte] = lista[0]
  for (const [lon, lat] of lista) {
    oeste = Math.min(oeste, lon)
    este = Math.max(este, lon)
    sur = Math.min(sur, lat)
    norte = Math.max(norte, lat)
  }
  return [
    [oeste, sur],
    [este, norte],
  ]
}

/** Límites [[oeste, sur], [este, norte]] de todos los elementos, o null si no hay. */
export function limitesDeElementos(elementos: { geometry: GeometriaAtencion }[]): Limites | null {
  return caja(elementos.flatMap((e) => posiciones(e.geometry)))
}

/**
 * Punto del marcador: el Point tal cual; en Polygon y MultiPolygon, el centro de su caja.
 * SUPUESTO (pendiente de confirmar): la guía no dice dónde va el marcador de una atención sobre un área.
 */
export function puntoRepresentativo(g: GeometriaAtencion): [number, number] {
  if (g.type === 'Point') return [g.coordinates[0], g.coordinates[1]]
  const limites = caja(posiciones(g))
  // Un polígono válido siempre tiene posiciones; la rama nula no ocurre tras `esGeometriaValida`.
  if (!limites) return [0, 0]
  const [[oeste, sur], [este, norte]] = limites
  return [(oeste + este) / 2, (sur + norte) / 2]
}

/** Elementos o filas de los tipos visibles (casillas del panel de capas). */
export function soloTiposVisibles<T extends { tipo_atencion: TipoAtencion }>(
  lista: T[],
  visibles: ReadonlySet<TipoAtencion>,
): T[] {
  return lista.filter((e) => visibles.has(e.tipo_atencion))
}

/** Texto accesible del marcador: «Atención AT-001, Poda, 10 oct. 2026, Plaza de Armas». */
export function textoMarcador(a: AtencionMapa): string {
  return `Atención ${a.codigo}, ${a.tipo_atencion}, ${formatearFecha(a.fecha)}, ${a.espacio}`
}

export type ClaveFiltroMapa =
  | 'desde'
  | 'hasta'
  | 'tipo_atencion'
  | 'area_verde_id'
  | 'tipo_servicio_id'
  | 'estado'
  | 'modalidad'
  | 'es_riesgo'

/** Filtros de la URL → consulta de la API. `tipo_atencion` se valida; `es_riesgo` 'true' | 'false' → boolean. */
export function aConsultaMapa(filtros: Record<ClaveFiltroMapa, string>): ConsultaMapa {
  const consulta: ConsultaMapa = aConsultaGestion({
    desde: filtros.desde,
    hasta: filtros.hasta,
    area_verde_id: filtros.area_verde_id,
    tipo_servicio_id: filtros.tipo_servicio_id,
    estado: filtros.estado,
    modalidad: filtros.modalidad,
  })
  const tipo = TIPOS_ATENCION.find((t) => t === filtros.tipo_atencion)
  if (tipo) consulta.tipo_atencion = tipo
  if (filtros.es_riesgo === 'true') consulta.es_riesgo = true
  else if (filtros.es_riesgo === 'false') consulta.es_riesgo = false
  return consulta
}
