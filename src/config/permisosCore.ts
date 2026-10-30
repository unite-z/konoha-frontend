/**
 * Permisos de interfaz de MOD-01 (RF-T-004). Los códigos son los de `core_permiso`
 * (`konoha-backend/docs/modulos/mod01.md`). La interfaz solo oculta lo que el rol no puede hacer: el
 * servidor vuelve a comprobarlo y la pantalla siempre maneja el 403.
 */
import type { SesionCore } from '../types/core'

export const PERMISOS = {
  gestionarUsuarios: 'CORE.USUARIO.GESTIONAR',
  gestionarCatalogos: 'CORE.CATALOGO.GESTIONAR',
  consultarRepositorio: 'CORE.REPOSITORIO.CONSULTAR',
  consultarHistorial: 'CORE.HISTORIAL.CONSULTAR',
  consultarPlanificacion: 'PLA.PLANIFICACION.CONSULTAR',
  registrarAtencion: 'SER.ATENCION.REGISTRAR',
  consultarContratos: 'SER.CONTRATO.CONSULTAR',
  consultarIndicadores: 'REP.INDICADOR.CONSULTAR',
  consultarCuadrillas: 'CAM.CUADRILLA.CONSULTAR',
} as const

export type Permiso = (typeof PERMISOS)[keyof typeof PERMISOS]

/** `true` si la sesión tiene el permiso. Sin sesión, nunca. */
export function puede(sesion: SesionCore | null, permiso: string): boolean {
  return sesion !== null && sesion.permisos.includes(permiso)
}

/** Entradas de primer nivel del menú con enlace, según los permisos (HU-MOD01-007, «Menú por rol»). */
export type EntradaMenu = 'planificacion' | 'tercerizados' | 'reportes' | 'repositorio' | 'usuarios' | 'campo'

export function entradasMenu(sesion: SesionCore | null): Set<EntradaMenu> {
  const entradas = new Set<EntradaMenu>()
  if (puede(sesion, PERMISOS.consultarCuadrillas)) entradas.add('campo')
  if (puede(sesion, PERMISOS.consultarPlanificacion)) entradas.add('planificacion')
  // Servicios tercerizados incluye contratos y conformidades: el capataz no lo ve.
  if (puede(sesion, PERMISOS.registrarAtencion) || puede(sesion, PERMISOS.consultarContratos)) {
    entradas.add('tercerizados')
  }
  if (puede(sesion, PERMISOS.consultarIndicadores)) entradas.add('reportes')
  if (puede(sesion, PERMISOS.consultarRepositorio)) entradas.add('repositorio')
  if (puede(sesion, PERMISOS.gestionarUsuarios)) entradas.add('usuarios')
  return entradas
}
