/**
 * Permisos de interfaz de MOD-01 (RF-T-004). Los códigos son los de `core_permiso`
 * (`konoha-backend/docs/modulos/mod01.md`). La interfaz solo oculta lo que el rol no puede hacer: el
 * servidor vuelve a comprobarlo y la pantalla siempre maneja el 403.
 */
import type { SesionCore } from '../types/core'
import { DATOS_SIMULADOS } from './datosSimulados'

export const PERMISOS = {
  gestionarUsuarios: 'CORE.USUARIO.GESTIONAR',
  gestionarCatalogos: 'CORE.CATALOGO.GESTIONAR',
  consultarRepositorio: 'CORE.REPOSITORIO.CONSULTAR',
  consultarHistorial: 'CORE.HISTORIAL.CONSULTAR',
  consultarPlanificacion: 'PLA.PLANIFICACION.CONSULTAR',
  /** Marcar jardines de la ruta de corte (contrato de AV-260 y AV-252). */
  registrarCorte: 'PLA.CORTE.REGISTRAR',
  registrarAtencion: 'SER.ATENCION.REGISTRAR',
  consultarContratos: 'SER.CONTRATO.CONSULTAR',
  consultarIndicadores: 'REP.INDICADOR.CONSULTAR',
  consultarCuadrillas: 'CAM.CUADRILLA.CONSULTAR',
  consultarPartes: 'CAM.PARTE.CONSULTAR',
  consultarInventario: 'INV.INVENTARIO.CONSULTAR',
  registrarInventario: 'INV.INVENTARIO.REGISTRAR',
} as const

export type Permiso = (typeof PERMISOS)[keyof typeof PERMISOS]

/** `true` si la sesión tiene el permiso. Sin sesión, nunca. */
export function puede(sesion: SesionCore | null, permiso: string): boolean {
  return sesion !== null && sesion.permisos.includes(permiso)
}

/** Entradas de primer nivel del menú con enlace, según los permisos (HU-MOD01-007, «Menú por rol»). */
export type EntradaMenu = 'planificacion' | 'corte' | 'incidencias' | 'misIncidencias' | 'tercerizados' | 'reportes' | 'repositorio' | 'usuarios' | 'campo' | 'inventario'

export function entradasMenu(sesion: SesionCore | null): Set<EntradaMenu> {
  const entradas = new Set<EntradaMenu>()
  if (puede(sesion, PERMISOS.consultarCuadrillas)) entradas.add('campo')
  if (puede(sesion, PERMISOS.consultarInventario)) entradas.add('inventario')
  if (puede(sesion, PERMISOS.consultarPlanificacion)) entradas.add('planificacion')
  // Ruta de hoy del capataz (AV-271): quien registra el avance del corte (AV-260).
  if (puede(sesion, PERMISOS.registrarCorte)) entradas.add('corte')
  // Mis incidencias (AV-282): cualquier usuario con sesión reporta y sigue las suyas. Sin backend (AV-274), solo con
  // datos simulados (D9).
  if (sesion && DATOS_SIMULADOS) entradas.add('misIncidencias')
  // Incidencias: el permiso propio llega con AV-281; hasta entonces, el de Planificación (el jefe).
  if (puede(sesion, PERMISOS.consultarPlanificacion)) entradas.add('incidencias')
  // Servicios tercerizados incluye contratos y conformidades: el capataz no lo ve.
  if (puede(sesion, PERMISOS.registrarAtencion) || puede(sesion, PERMISOS.consultarContratos)) {
    entradas.add('tercerizados')
  }
  if (puede(sesion, PERMISOS.consultarIndicadores)) entradas.add('reportes')
  if (puede(sesion, PERMISOS.consultarRepositorio)) entradas.add('repositorio')
  if (puede(sesion, PERMISOS.gestionarUsuarios)) entradas.add('usuarios')
  return entradas
}
