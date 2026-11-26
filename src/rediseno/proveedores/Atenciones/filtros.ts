import {
  FILTROS_BANDEJA_VACIOS,
  hayFiltros,
  leerFiltrosBandeja,
  type ClaveFiltroBandeja,
  type FiltrosBandeja,
} from '@/utils/filtrosBandeja'
import type { FiltrosAtenciones } from '@/types/tercerizados'
import type { ParametroAtenciones } from '../enlaces'

export const POR_PAGINA = 25
/** Atenciones que enseña «Atenciones recientes» en la vista principal. */
export const RECIENTES = 5

/** Filtros que «Limpiar filtros» quita (todos menos la página). */
export const CLAVES_FILTRO: readonly Exclude<ParametroAtenciones, 'pagina'>[] = [
  'q',
  'estado',
  'origen',
  'clase',
  'contrato_id',
  'desde',
  'hasta',
  'area_verde_id',
]

/** `AAAA-MM-DD` que existe en el calendario; si no, `undefined`. */
function fechaValida(texto: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return undefined
  const fecha = new Date(`${texto}T00:00:00Z`)
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().startsWith(texto) ? texto : undefined
}

/**
 * Lee de la URL los filtros válidos; lo inválido se ignora en lugar de enviarse a la API. Un rango con «desde»
 * posterior a «hasta» se descarta entero (la API lo rechazaría).
 */
export function filtrosDeUrl(parametros: URLSearchParams): FiltrosBandeja {
  const url = { ...FILTROS_BANDEJA_VACIOS }
  for (const clave of Object.keys(url) as ClaveFiltroBandeja[]) url[clave] = parametros.get(clave) ?? ''
  const { filtros, pagina } = leerFiltrosBandeja(url)
  const desde = fechaValida(parametros.get('desde') ?? '')
  const hasta = fechaValida(parametros.get('hasta') ?? '')
  if (!(desde && hasta && desde > hasta)) {
    if (desde) filtros.desde = desde
    if (hasta) filtros.hasta = hasta
  }
  const area = parametros.get('area_verde_id') ?? ''
  if (/^\d{1,9}$/.test(area) && Number(area) >= 1) filtros.area_verde_id = Number(area)
  return { filtros, pagina }
}

/** `true` si hay algún filtro aplicado (para el estado vacío y «Limpiar filtros»). */
export function hayFiltrosAtenciones(filtros: FiltrosAtenciones): boolean {
  return hayFiltros(filtros) || Boolean(filtros.desde || filtros.hasta || filtros.area_verde_id)
}

/** Copia de la URL con los cambios aplicados (`null` quita el parámetro). */
export function conCambios(parametros: URLSearchParams, cambios: Record<string, string | null>): URLSearchParams {
  const nuevos = new URLSearchParams(parametros)
  for (const [clave, valor] of Object.entries(cambios)) {
    if (valor === null || valor === '') nuevos.delete(clave)
    else nuevos.set(clave, valor)
  }
  return nuevos
}
