/**
 * Mensajes del back-end sobre el periodo (400 de validación de DRF), para mostrarlos junto a su campo.
 */
import type { ErroresPeriodo } from '../../../components/ui/validacionPeriodo'
import type { ErrorApi } from '../../../services/api/cliente'

export function erroresDePeriodo(error: ErrorApi | null): ErroresPeriodo | undefined {
  if (!error || error.estado !== 400) return undefined
  const desde = error.errores_campo.desde?.[0]
  const hasta = error.errores_campo.hasta?.[0]
  return desde || hasta ? { desde, hasta } : undefined
}
