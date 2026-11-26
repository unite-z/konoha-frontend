import type { FormatoSalida, TipoReporte } from '@/types/exportaciones'
import { PREFIJO_REDISENO } from '../prefijo'

export const SEGMENTO_REPORTES = 'reportes'
export const RUTA_REPORTES = `${PREFIJO_REDISENO}/${SEGMENTO_REPORTES}`

/** Parámetros de la URL de Reportes: indicador abierto (panel) e informe elegido (RD-60 a RD-62). */
export const PARAMETRO_INDICADOR = 'indicador'
export const PARAMETRO_INFORME = 'informe'
/** Panel «Exportar» (RD-62): `?exportar=1`, o `?tipo=` (con `&mes=` y los filtros) para precargarlo. */
export const PARAMETRO_EXPORTAR = 'exportar'
/** Parámetros propios del panel «Exportar»; `mes` no está porque también puede ser filtro de un informe. */
export const PARAMETROS_EXPORTAR = [PARAMETRO_EXPORTAR, 'tipo', 'formato'] as const

export interface OpcionesRutaReportes {
  /** Informe del selector (`?informe=<clave>`). */
  informe?: string
  /** Indicador cuyo panel se abre (`?indicador=<clave>`). */
  indicador?: string
  /** Abre el panel «Exportar»; con `tipo` y `mes` lo precarga (`?tipo=&mes=`). */
  exportar?: { tipo?: TipoReporte; mes?: string; formato?: FormatoSalida }
  /**
   * Filtros que se conservan (la consulta actual, con o sin «?»). Se descartan `page`, `indicador`, `informe` y los
   * del panel «Exportar»: solo hay un panel abierto a la vez.
   */
  filtros?: string
}

/** Ruta de Reportes; con `filtros` conserva el periodo y los demás filtros de la URL. */
export function rutaReportes(opciones: OpcionesRutaReportes = {}): string {
  const parametros = new URLSearchParams(opciones.filtros ?? '')
  for (const clave of ['page', PARAMETRO_INDICADOR, PARAMETRO_INFORME, ...PARAMETROS_EXPORTAR]) parametros.delete(clave)
  if (opciones.indicador) parametros.set(PARAMETRO_INDICADOR, opciones.indicador)
  if (opciones.informe) parametros.set(PARAMETRO_INFORME, opciones.informe)
  const { exportar } = opciones
  if (exportar) {
    if (exportar.tipo) parametros.set('tipo', exportar.tipo)
    else parametros.set(PARAMETRO_EXPORTAR, '1')
    if (exportar.mes) parametros.set('mes', exportar.mes)
    if (exportar.formato) parametros.set('formato', exportar.formato)
  }
  const consulta = parametros.toString()
  return consulta ? `${RUTA_REPORTES}?${consulta}` : RUTA_REPORTES
}
