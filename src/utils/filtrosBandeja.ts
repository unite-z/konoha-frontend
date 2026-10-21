/**
 * Filtros de la bandeja de atenciones leídos de la URL (Guía Web 6.1: se conservan al volver de la ficha).
 *
 * Los valores no válidos de la URL (editada a mano o de una versión anterior) se ignoran en lugar de
 * enviarse a la API: así la bandeja nunca falla por un enlace viejo.
 */
import type { EstadoAtencion, FiltrosAtenciones, OrigenAtencion } from '../types/tercerizados'
import { ESTADOS_ATENCION, OPCIONES_ORIGEN } from './estadosTercerizados'

/** Claves en la URL (`useFiltrosUrl`). */
export type ClaveFiltroBandeja = 'q' | 'estado' | 'origen' | 'contrato_id' | 'pagina'

export const FILTROS_BANDEJA_VACIOS: Record<ClaveFiltroBandeja, string> = {
  q: '',
  estado: '',
  origen: '',
  contrato_id: '',
  pagina: '',
}

/** Largo máximo de la búsqueda que admite la API. */
export const LARGO_MAXIMO_BUSQUEDA = 100

export interface FiltrosBandeja {
  filtros: FiltrosAtenciones
  pagina: number
}

function enteroPositivo(texto: string): number | undefined {
  if (!/^\d{1,9}$/.test(texto)) return undefined
  const valor = Number(texto)
  return valor >= 1 ? valor : undefined
}

/** Convierte los parámetros de la URL en filtros válidos para la API. */
export function leerFiltrosBandeja(url: Record<ClaveFiltroBandeja, string>): FiltrosBandeja {
  const filtros: FiltrosAtenciones = {}
  const q = url.q.trim().slice(0, LARGO_MAXIMO_BUSQUEDA)
  if (q) filtros.q = q
  if ((ESTADOS_ATENCION as readonly string[]).includes(url.estado)) filtros.estado = url.estado as EstadoAtencion
  if (OPCIONES_ORIGEN.some((o) => o.valor === url.origen)) filtros.origen = url.origen as OrigenAtencion
  const contrato = enteroPositivo(url.contrato_id)
  if (contrato) filtros.contrato_id = contrato
  return { filtros, pagina: enteroPositivo(url.pagina) ?? 1 }
}

/** `true` si hay algún filtro aplicado (para el estado vacío y «Limpiar filtros»). */
export function hayFiltros(filtros: FiltrosAtenciones): boolean {
  return Boolean(filtros.q || filtros.estado || filtros.origen || filtros.contrato_id)
}
