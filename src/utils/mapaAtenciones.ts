/**
 * Lógica pura del mapa de atenciones (RF-REP-007 · CU-MOD06-003): validación de geometrías GeoJSON, filas de la
 * lista (A1: lo que no se dibuja se encuentra en la lista), cruce con el mapa del campus de MOD-02 (polígonos de
 * las áreas con atenciones y puntos de los ejemplares) y filtros de la URL. Sin React, para poder probarla.
 */
import type {
  AtencionMapa,
  ConsultaMapa,
  ElementoGeoJson,
  GeometriaAtencion,
  ResultadoMapaAtenciones,
  TipoAtencion,
} from '../types/reportesGestion'
import { aConsultaGestion, enteroPositivo, TIPOS_ATENCION } from './reportesGestion'

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

/**
 * Clave estable y única por fila: una atención se repite por cada espacio o ejemplar de su alcance, y el id de una
 * actividad del personal propio puede coincidir con el de una atención tercerizada (por eso va la modalidad).
 */
export function claveFilaMapa(a: AtencionMapa): string {
  return `${a.modalidad}-${a.atencion_id}-${a.area_verde_id ?? 'sin'}-${a.ejemplar_id ?? 'sin'}`
}

/** `true` si la fila es una atención tercerizada de MOD-05 (tiene ficha propia); `false` si es una actividad. */
export function esAtencionTercerizada(a: AtencionMapa): boolean {
  return a.modalidad === 'Tercerizado'
}

/** Tipo de uso con su color del catálogo de MOD-02. */
export interface UsoColoreado {
  id: number
  nombre: string
  color: string
}

/** Tipos de uso de los espacios con atenciones, en el orden del catálogo (para la leyenda). */
export function usosDeFilas(filas: AtencionMapa[], usos: UsoColoreado[]): UsoColoreado[] {
  const presentes = new Set(filas.map((f) => f.tipo_uso_id))
  return usos.filter((u) => presentes.has(u.id))
}

/** Vínculo de un polígono del mapa del campus (MOD-02) con su área del inventario. */
export interface VinculoPoligono {
  id_fuente: string
  area_verde_id: number | null
}

/** Polígonos del mapa del campus (`id_fuente`) cuyas áreas de MOD-02 tienen atenciones. */
export function poligonosConAtenciones(filas: AtencionMapa[], vinculos: VinculoPoligono[]): Set<string> {
  const areas = new Set(filas.map((f) => f.area_inventario_id).filter((id): id is number => id !== null))
  return new Set(vinculos.filter((v) => v.area_verde_id !== null && areas.has(v.area_verde_id)).map((v) => v.id_fuente))
}

/** Atenciones de un área de MOD-02 (las del espacio y las de sus ejemplares). */
export function filasDeArea<F extends AtencionMapa>(filas: F[], areaInventarioId: number): F[] {
  return filas.filter((f) => f.area_inventario_id === areaInventarioId)
}

/** Atenciones de un ejemplar. */
export function filasDeEjemplar<F extends AtencionMapa>(filas: F[], ejemplarId: number): F[] {
  return filas.filter((f) => f.ejemplar_id === ejemplarId)
}

/** Punto de un ejemplar con atenciones en el mapa del campus (la forma de `PuntoEjemplar` del mapa compartido). */
export interface PuntoAtenciones {
  id: number
  codigo: string
  /** Texto del punto: cuántas atenciones tiene. */
  especie: string
  latitud: number
  longitud: number
}

/** Un punto por ejemplar con ubicación, con el número de atenciones del periodo. */
export function puntosDeEjemplares(elementos: ElementoDibujable[]): PuntoAtenciones[] {
  const puntos = new Map<number, PuntoAtenciones>()
  const totales = new Map<number, number>()
  for (const { geometry, properties } of elementos) {
    if (geometry.type !== 'Point' || properties.ejemplar_id === null) continue
    const total = (totales.get(properties.ejemplar_id) ?? 0) + 1
    totales.set(properties.ejemplar_id, total)
    puntos.set(properties.ejemplar_id, {
      id: properties.ejemplar_id,
      codigo: properties.ejemplar_codigo ?? `Ejemplar ${properties.ejemplar_id}`,
      especie: `${total} ${total === 1 ? 'atención' : 'atenciones'}`,
      longitud: geometry.coordinates[0],
      latitud: geometry.coordinates[1],
    })
  }
  return [...puntos.values()]
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

/** Elementos o filas de los tipos visibles (casillas del panel de capas). */
export function soloTiposVisibles<T extends { tipo_atencion: TipoAtencion }>(
  lista: T[],
  visibles: ReadonlySet<TipoAtencion>,
): T[] {
  return lista.filter((e) => visibles.has(e.tipo_atencion))
}

export type ClaveFiltroMapa =
  | 'desde'
  | 'hasta'
  | 'tipo_atencion'
  | 'tipo_uso_id'
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
  const tipoUso = enteroPositivo(filtros.tipo_uso_id)
  if (tipoUso !== undefined) consulta.tipo_uso_id = tipoUso
  if (filtros.es_riesgo === 'true') consulta.es_riesgo = true
  else if (filtros.es_riesgo === 'false') consulta.es_riesgo = false
  return consulta
}
