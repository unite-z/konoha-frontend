/**
 * Validación del periodo de los filtros (Guía Web 5.3: el formulario dice qué hacer).
 * Los mensajes son los mismos que devuelve el back-end (`comun/periodo.py`).
 */
import { esFechaIsoValida } from '../../utils/formato'

export const MENSAJES_PERIODO = {
  faltaDesde: 'Indica la fecha de inicio del periodo (desde)',
  faltaHasta: 'Indica la fecha de fin del periodo (hasta)',
  orden: 'La fecha de fin debe ser igual o posterior a la fecha de inicio',
} as const

export interface ErroresPeriodo {
  desde?: string
  hasta?: string
}

/** Valida el periodo antes de consultar la API. */
export function validarPeriodo(desde: string, hasta: string): ErroresPeriodo {
  const errores: ErroresPeriodo = {}
  if (!desde || !esFechaIsoValida(desde)) errores.desde = MENSAJES_PERIODO.faltaDesde
  if (!hasta || !esFechaIsoValida(hasta)) errores.hasta = MENSAJES_PERIODO.faltaHasta
  if (!errores.desde && !errores.hasta && hasta < desde) errores.hasta = MENSAJES_PERIODO.orden
  return errores
}
