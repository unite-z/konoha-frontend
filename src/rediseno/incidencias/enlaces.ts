import { PREFIJO_REDISENO } from '../prefijo'

export const SEGMENTO_INCIDENCIAS = 'incidencias'
export const RUTA_INCIDENCIAS = `${PREFIJO_REDISENO}/${SEGMENTO_INCIDENCIAS}`

/** Parámetro que selecciona una incidencia (`?incidencia=12`); el detalle (RD-43) se abre con él. */
export const PARAM_INCIDENCIA = 'incidencia'

/** Claves de la bandeja en la URL: grupo de estado, búsqueda y página. */
export type ParametroIncidencias = typeof PARAM_INCIDENCIA | 'grupo' | 'q' | 'pagina'

/** Bandeja de incidencias, con sus filtros y la incidencia seleccionada en la URL. */
export function rutaIncidencias(filtros: Partial<Record<ParametroIncidencias, string>> = {}): string {
  const consulta = new URLSearchParams()
  for (const [clave, valor] of Object.entries(filtros)) if (valor) consulta.set(clave, valor)
  const texto = consulta.toString()
  return texto ? `${RUTA_INCIDENCIAS}?${texto}` : RUTA_INCIDENCIAS
}

/** Bandeja con una incidencia seleccionada (y, cuando exista RD-43, su detalle abierto). */
export function rutaIncidencia(id: number | string): string {
  return rutaIncidencias({ [PARAM_INCIDENCIA]: String(id) })
}
