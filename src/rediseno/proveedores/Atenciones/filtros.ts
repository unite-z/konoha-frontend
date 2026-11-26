import {
  FILTROS_BANDEJA_VACIOS,
  leerFiltrosBandeja,
  type ClaveFiltroBandeja,
  type FiltrosBandeja,
} from '@/utils/filtrosBandeja'

export const POR_PAGINA = 25
/** Atenciones que enseña «Atenciones recientes» en la vista principal. */
export const RECIENTES = 5

/** Lee de la URL los filtros válidos; lo inválido se ignora. */
export function filtrosDeUrl(parametros: URLSearchParams): FiltrosBandeja {
  const url = { ...FILTROS_BANDEJA_VACIOS }
  for (const clave of Object.keys(url) as ClaveFiltroBandeja[]) url[clave] = parametros.get(clave) ?? ''
  return leerFiltrosBandeja(url)
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
