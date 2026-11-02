/**
 * Tipos de la exportación de reportes del MOD-06 (RF-REP-009): `ReporteGenerado` del Modelo BD (4.6.2).
 * Claves en snake_case como el JSON (ADR 0005). Base de la API: `/api/v1/reportes/exportaciones/`.
 */
import type { FechaIso, InstanteIso } from './comun'

/** TipoReporte del Modelo BD (4.6.2). */
export type TipoReporte =
  | 'GestionOSG'
  | 'ServicioTercerizado'
  | 'MaterialVegetal'
  | 'DistribucionPersonal'
  | 'MatrizIncidencias'
  | 'Listado'

/** FormatoSalida. */
export type FormatoSalida = 'PDF' | 'Excel'

/** Filtro que admite un tipo de reporte (pinta el control adecuado). */
export type FiltroExportable = 'periodo' | 'mes' | 'tipo_servicio_id' | 'proveedor_id' | 'area_verde_id' | 'modalidad'

/** GET exportaciones/tipos/: un tipo exportable. */
export interface TipoExportable {
  tipo: TipoReporte
  nombre: string
  descripcion: string
  formatos: FormatoSalida[]
  filtros: FiltroExportable[]
  /** `false` si la fuente aún no existe (por ejemplo, la matriz de incidencias); se muestra deshabilitado. */
  disponible: boolean
  motivo_no_disponible: string | null
  /** Límite de filas por formato (A1); null = sin límite. */
  limite_filas: Partial<Record<FormatoSalida, number>> | null
}

/** Parámetros guardados en ReporteGenerado.parametros (periodo y filtros de la consulta). */
export interface ParametrosExportacion {
  desde?: FechaIso
  hasta?: FechaIso
  mes?: string
  tipo_servicio_id?: number
  proveedor_id?: number
  area_verde_id?: number
  modalidad?: string
}

/** POST exportaciones/ (cuerpo). */
export interface SolicitudExportacion {
  tipo: TipoReporte
  formato: FormatoSalida
  parametros: ParametrosExportacion
}

/** ReporteGenerado (Modelo BD 4.6.2), con los textos de interfaz. */
export interface ReporteGenerado {
  id: number
  tipo: TipoReporte
  etiqueta_tipo: string
  formato: FormatoSalida
  parametros: ParametrosExportacion
  /** Resumen legible de los parámetros («Octubre de 2026 · Control fitosanitario»). */
  resumen_parametros: string
  usuario: string
  fecha_hora: InstanteIso
  archivo: { id: number; nombre: string; tamano_bytes: number } | null
  filas: number
}

/** Consulta del historial (GET exportaciones/). */
export interface ConsultaExportaciones {
  page?: number
  tipo?: TipoReporte
}
