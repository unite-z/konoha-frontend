/**
 * Permisos de interfaz de MOD-01 (RF-T-004). Los códigos son los de `core_permiso`
 * (`konoha-backend/docs/modulos/mod01.md`). La interfaz solo oculta lo que el rol no puede hacer: el
 * servidor vuelve a comprobarlo y la pantalla siempre maneja el 403.
 */
import type { SesionCore } from '../types/core'

export const PERMISOS = {
  gestionarUsuarios: 'CORE.USUARIO.GESTIONAR',
  /** Editar los permisos de cada rol (AV-381): solo el superadministrador. */
  gestionarRoles: 'CORE.ROL.GESTIONAR',
  gestionarCatalogos: 'CORE.CATALOGO.GESTIONAR',
  consultarRepositorio: 'CORE.REPOSITORIO.CONSULTAR',
  consultarHistorial: 'CORE.HISTORIAL.CONSULTAR',
  consultarPlanificacion: 'PLA.PLANIFICACION.CONSULTAR',
  /** Configurar servicios y restricciones, y planificar ciclos: jefatura de sección. */
  gestionarPlanificacion: 'PLA.PLANIFICACION.GESTIONAR',
  /** Marcar jardines de la ruta de corte (contrato de AV-260 y AV-252). */
  registrarCorte: 'PLA.CORTE.REGISTRAR',
  /** Reportar incidencias y consultar la bandeja y la ficha (AV-281: los cuatro roles). */
  registrarIncidencia: 'PLA.INCIDENCIA.REGISTRAR',
  /** Clasificar, derivar, reasignar y cerrar incidencias: jefatura de sección. */
  clasificarIncidencia: 'PLA.INCIDENCIA.CLASIFICAR',
  registrarAtencion: 'SER.ATENCION.REGISTRAR',
  consultarContratos: 'SER.CONTRATO.CONSULTAR',
  consultarIndicadores: 'REP.INDICADOR.CONSULTAR',
  consultarCuadrillas: 'CAM.CUADRILLA.CONSULTAR',
  /** Crear cuadrillas y encargos y mantener el catálogo de actividades: jefatura de sección. */
  gestionarCuadrillas: 'CAM.CUADRILLA.GESTIONAR',
  consultarPartes: 'CAM.PARTE.CONSULTAR',
  /** Anular una actividad registrada: solo jefatura de sección (AV-384). */
  anularParte: 'CAM.PARTE.ANULAR',
  consultarInventario: 'INV.INVENTARIO.CONSULTAR',
  registrarInventario: 'INV.INVENTARIO.REGISTRAR',
  /** Planificar la campaña de poda mayor (AV-308). */
  planificarPoda: 'INV.PODA.PLANIFICAR',
  /** Registrar la poda de un ejemplar (AV-309): ingeniero de campo y practicante. */
  registrarPoda: 'INV.PODA.REGISTRAR',
} as const

export type Permiso = (typeof PERMISOS)[keyof typeof PERMISOS]

/** `true` si la sesión tiene el permiso. Sin sesión, nunca. */
export function puede(sesion: SesionCore | null, permiso: string): boolean {
  return sesion !== null && sesion.permisos.includes(permiso)
}

/** Entradas de primer nivel del menú con enlace, según los permisos (HU-MOD01-007, «Menú por rol»). */
export type EntradaMenu =
  | 'planificacion'
  | 'corte'
  | 'incidencias'
  | 'misIncidencias'
  | 'tercerizados'
  | 'reportes'
  | 'repositorio'
  | 'usuarios'
  | 'campo'
  | 'inventario'

export function entradasMenu(sesion: SesionCore | null): Set<EntradaMenu> {
  const entradas = new Set<EntradaMenu>()
  if (puede(sesion, PERMISOS.consultarCuadrillas)) entradas.add('campo')
  if (puede(sesion, PERMISOS.consultarInventario)) entradas.add('inventario')
  if (puede(sesion, PERMISOS.consultarPlanificacion)) entradas.add('planificacion')
  // Ruta de hoy del capataz (AV-271): quien registra el avance del corte (AV-260).
  if (puede(sesion, PERMISOS.registrarCorte)) entradas.add('corte')
  // Incidencias (AV-281): la bandeja y la ficha, y «Mis incidencias» para reportar y seguir las propias (AV-282).
  if (puede(sesion, PERMISOS.registrarIncidencia)) {
    entradas.add('incidencias')
    entradas.add('misIncidencias')
  }
  // Servicios tercerizados incluye contratos y conformidades: el capataz no lo ve.
  if (puede(sesion, PERMISOS.registrarAtencion) || puede(sesion, PERMISOS.consultarContratos)) {
    entradas.add('tercerizados')
  }
  if (puede(sesion, PERMISOS.consultarIndicadores)) entradas.add('reportes')
  if (puede(sesion, PERMISOS.consultarRepositorio)) entradas.add('repositorio')
  if (puede(sesion, PERMISOS.gestionarUsuarios)) entradas.add('usuarios')
  return entradas
}
