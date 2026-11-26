import { PREFIJO_REDISENO } from '../prefijo'

export const SEGMENTO_REPORTES = 'reportes'
export const RUTA_REPORTES = `${PREFIJO_REDISENO}/${SEGMENTO_REPORTES}`

/** Parámetros de la URL de Reportes: indicador abierto (panel) e informe elegido (RD-60 a RD-62). */
export const PARAMETRO_INDICADOR = 'indicador'
export const PARAMETRO_INFORME = 'informe'

export interface OpcionesRutaReportes {
  /** Informe del selector (`?informe=<clave>`). */
  informe?: string
  /** Indicador cuyo panel se abre (`?indicador=<clave>`). */
  indicador?: string
  /** Filtros que se conservan (la consulta actual, con o sin «?»). Se descartan `page`, `indicador` e `informe`. */
  filtros?: string
}

/** Ruta de Reportes; con `filtros` conserva el periodo y los demás filtros de la URL. */
export function rutaReportes(opciones: OpcionesRutaReportes = {}): string {
  const parametros = new URLSearchParams(opciones.filtros ?? '')
  for (const clave of ['page', PARAMETRO_INDICADOR, PARAMETRO_INFORME]) parametros.delete(clave)
  if (opciones.indicador) parametros.set(PARAMETRO_INDICADOR, opciones.indicador)
  if (opciones.informe) parametros.set(PARAMETRO_INFORME, opciones.informe)
  const consulta = parametros.toString()
  return consulta ? `${RUTA_REPORTES}?${consulta}` : RUTA_REPORTES
}
