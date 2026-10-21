/**
 * Tipos comunes del contrato con la API del MOD-06.
 * Reflejan `backend/reportes_indicadores/api/serializers.py` (ReporteBaseSerializer, ErrorSerializer).
 */

/** Fecha sin hora, en formato `AAAA-MM-DD`. */
export type FechaIso = string

/** Instante ISO 8601 con zona (por ejemplo `2026-10-20T09:00:00-05:00`). */
export type InstanteIso = string

/** PeriodoSalidaSerializer. */
export interface Periodo {
  desde: FechaIso
  hasta: FechaIso
}

/** Campos comunes de toda respuesta de reporte (ReporteBaseSerializer). */
export interface ReporteBase<F> {
  periodo: Periodo
  filtros_aplicados: F
  generado_en: InstanteIso
  sin_datos: boolean
  mensaje_sin_datos: string | null
}

/** IndicadorSerializer: DefinicionIndicador asociada al reporte. */
export interface Indicador {
  codigo: string
  nombre: string | null
  descripcion_calculo: string | null
  meta: number | null
  unidad: string | null
}

/** Cuerpo de error de dominio (ErrorSerializer). */
export interface CuerpoErrorDominio {
  codigo: string
  detalle: string
}

/** Respuesta paginada de DRF (PageNumberPagination). */
export interface Paginado<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
