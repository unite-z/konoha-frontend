/**
 * Acciones de MOD-03 por permiso (AV-382). La interfaz solo oculta: el back-end vuelve a comprobar y puede responder 403.
 */
import { tiene, type Permisos } from './permisosSesion'

/** Editar frecuencias, duraciones y restricciones: `PLA.PLANIFICACION.GESTIONAR`. */
export function puedeEditarPlanificacion(permisos: Permisos): boolean {
  return tiene(permisos, 'PLA.PLANIFICACION.GESTIONAR')
}
