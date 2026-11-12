/**
 * Permisos del MOD-06: los códigos de MOD-01 de la sesión (AV-382), los mismos que comprueba el backend.
 *
 * La interfaz oculta lo que el rol no puede hacer (Arquitectura de la Información: «la navegación no
 * presenta opciones que luego sean rechazadas»). El back-end vuelve a comprobarlo.
 */
import type { SesionCore } from '../types/core'
import { DATOS_SIMULADOS } from './datosSimulados'
import { PERMISOS, puede as puedeSesion } from './permisosCore'
import { tiene, type Permisos } from './permisosSesion'

/** Consultar los reportes RF-REP-002, RF-REP-004 y RF-REP-006. */
export const PERMISO_CONSULTA_REPORTES = 'REP.INDICADOR.CONSULTAR'

/** Solicitar y proponer con IA (RF-IA-001). */
export const PERMISO_SOLICITAR_IA = 'IA.PROPUESTA.PROPONER'

/** Validar o rechazar la propuesta de IA. */
export const PERMISO_VALIDAR_IA = 'IA.PROPUESTA.VALIDAR'

/** `true` si la sesión tiene el permiso (AV-382: por permiso, no por nombre de rol). */
export function puede(permisos: Permisos, permiso: string): boolean {
  return tiene(permisos, permiso)
}

/**
 * Exportar reportes (RF-REP-009): código de permiso de la sesión de MOD-01 (`REP.INDICADOR.EXPORTAR`).
 * Se define aquí para no tocar `permisosCore.ts` (MOD-01).
 */
export const PERMISO_EXPORTAR_INDICADORES = 'REP.INDICADOR.EXPORTAR'

/**
 * `true` si la sesión puede generar exportaciones. Con datos simulados basta el permiso de consulta, para
 * probar la pantalla aunque MOD-01 aún no asigne el de exportar; con el backend se exige el de exportar.
 */
export function puedeExportar(sesion: SesionCore | null, datosSimulados: boolean = DATOS_SIMULADOS): boolean {
  return puedeSesion(sesion, PERMISO_EXPORTAR_INDICADORES) || (datosSimulados && puedeSesion(sesion, PERMISOS.consultarIndicadores))
}
