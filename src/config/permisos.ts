/**
 * Permisos por rol del MOD-06 (matriz de permisos, Historias de Usuario v3, sección 2.1).
 * Son los mismos conjuntos que `backend/reportes_indicadores/permisos.py`.
 *
 * La interfaz oculta lo que el rol no puede hacer (Arquitectura de la Información: «la navegación no
 * presenta opciones que luego sean rechazadas»). El back-end vuelve a comprobarlo.
 */
import type { Rol } from './sesion'

/** Reportes RF-REP-002, RF-REP-004 y RF-REP-006: consulta. */
export const ROLES_CONSULTA_REPORTES: ReadonlySet<Rol> = new Set<Rol>([
  'Jefe de sección',
  'Ingeniero de campo',
  'Practicante',
])

/** Solicitar el análisis de IA (RF-IA-001): el jefe de sección lo hace; ingeniero y practicante proponen. */
export const ROLES_SOLICITAR_IA: ReadonlySet<Rol> = new Set<Rol>([
  'Jefe de sección',
  'Ingeniero de campo',
  'Practicante',
])

/** Validar o rechazar la propuesta de IA: solo el jefe de sección. */
export const ROLES_VALIDAR_IA: ReadonlySet<Rol> = new Set<Rol>(['Jefe de sección'])

/** `true` si el rol pertenece al conjunto de roles autorizados. */
export function puede(rol: Rol, conjunto: ReadonlySet<Rol>): boolean {
  return conjunto.has(rol)
}
