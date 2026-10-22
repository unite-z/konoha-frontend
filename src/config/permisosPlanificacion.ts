/**
 * Acciones de MOD-03 por rol. La interfaz solo oculta: el back-end vuelve a comprobar y puede responder 403.
 */
import type { RolTercerizados } from '../types/tercerizados'

/** Solo el jefe de sección edita frecuencias, duraciones y restricciones. */
export function puedeEditarPlanificacion(rol: RolTercerizados | null | undefined): boolean {
  return rol === 'Jefe de sección'
}
