/**
 * Rutas y migas de pan del MOD-06 «Reportes e indicadores».
 * Separadas de `rutas.tsx` para que el layout y las páginas las usen sin importaciones circulares.
 */
import type { Miga } from '../layouts/LayoutOficina/ContextoPagina'

const BASE = '/reportes-indicadores'

export const RUTAS = {
  reportes: `${BASE}/reportes`,
  cumplimientoCorte: `${BASE}/reportes/cumplimiento-corte`, // RF-REP-002
  distribucionPersonal: `${BASE}/reportes/distribucion-personal`, // RF-REP-004
  atencionesEspacioSector: `${BASE}/reportes/atenciones-espacio-sector`, // RF-REP-006
  asistenciaIa: `${BASE}/asistencia-ia`,
  extraccionReportes: `${BASE}/asistencia-ia/extraccion-reportes`, // RF-IA-001
} as const

/** Prefijo de todas las rutas del módulo (para marcar el menú de primer nivel). */
export const PREFIJO_MODULO = BASE

/** Ruta de la ficha de revisión de una propuesta de IA (RF-IA-001). */
export function rutaRevisionExtraccion(id: number | string): string {
  return `${RUTAS.extraccionReportes}/${id}`
}

/** Niveles de migas reutilizados por las páginas (Guía Web 4.2). */
export const MIGAS = {
  reportesIndicadores: { texto: 'Reportes e indicadores', ruta: RUTAS.reportes },
  reportes: { texto: 'Reportes', ruta: RUTAS.reportes },
  asistenciaIa: { texto: 'Asistencia IA', ruta: RUTAS.asistenciaIa },
  extraccionReportes: { texto: 'Extracción de informes de proveedores', ruta: RUTAS.extraccionReportes },
} satisfies Record<string, Miga>

// --- MOD-05 «Servicios tercerizados» ---------------------------------------------------------------------

const BASE_TERCERIZADOS = '/servicios-tercerizados'

/** Prefijo de las rutas de MOD-05 (menú, cabecera y sesión). */
export const PREFIJO_TERCERIZADOS = BASE_TERCERIZADOS

export const RUTAS_TERCERIZADOS = {
  atenciones: `${BASE_TERCERIZADOS}/atenciones`,
  nuevaAtencion: `${BASE_TERCERIZADOS}/atenciones/nueva`, // RF-SER-003
  proveedoresContratos: `${BASE_TERCERIZADOS}/proveedores-contratos`, // RF-SER-001 y RF-SER-002
  nuevoProveedor: `${BASE_TERCERIZADOS}/proveedores-contratos/proveedores/nuevo`, // RF-SER-001
  nuevoContrato: `${BASE_TERCERIZADOS}/proveedores-contratos/contratos/nuevo`, // RF-SER-002
  controlFitosanitario: `${BASE_TERCERIZADOS}/control-fitosanitario`, // RF-INV-011
  marcarEjemplar: `${BASE_TERCERIZADOS}/control-fitosanitario/marcar`, // RF-INV-011
} as const

/** Ficha de una atención tercerizada. */
export function rutaDetalleAtencion(id: number | string): string {
  return `${RUTAS_TERCERIZADOS.atenciones}/${id}`
}

/** `true` si la ruta pertenece a MOD-05. */
export function esRutaTercerizados(ruta: string): boolean {
  return ruta === BASE_TERCERIZADOS || ruta.startsWith(`${BASE_TERCERIZADOS}/`)
}

// --- MOD-03 «Planificación» (comparte la sesión de MOD-05) ------------------------------------------------

const BASE_PLANIFICACION = '/planificacion'

/** Prefijo de las rutas de MOD-03 (menú, cabecera y sesión). */
export const PREFIJO_PLANIFICACION = BASE_PLANIFICACION

export const RUTAS_PLANIFICACION = {
  servicios: `${BASE_PLANIFICACION}/servicios-periodicos`, // HU-MOD03-001 y 002
  restricciones: `${BASE_PLANIFICACION}/calendario-restricciones`, // HU-MOD03-003
} as const

/** `true` si la ruta pertenece a MOD-03. */
export function esRutaPlanificacion(ruta: string): boolean {
  return ruta === BASE_PLANIFICACION || ruta.startsWith(`${BASE_PLANIFICACION}/`)
}

export const MIGAS_PLANIFICACION = {
  planificacion: { texto: 'Planificación', ruta: RUTAS_PLANIFICACION.servicios },
} satisfies Record<string, Miga>

// --- MOD-02 «Inventario de áreas verdes» -----------------------------------------------------------------

const BASE_INVENTARIO = '/areas-verdes'

export const PREFIJO_INVENTARIO = BASE_INVENTARIO

export const RUTAS_INVENTARIO = {
  areasVerdes: BASE_INVENTARIO,
  mapa: `${BASE_INVENTARIO}/mapa`,
  nuevaArea: `${BASE_INVENTARIO}/nueva`,
  coberturas: `${BASE_INVENTARIO}/coberturas`,
  catalogos: `${BASE_INVENTARIO}/catalogos`,
  ejemplares: `${BASE_INVENTARIO}/ejemplares`,
} as const

export function esRutaInventario(ruta: string): boolean {
  return ruta === BASE_INVENTARIO || ruta.startsWith(`${BASE_INVENTARIO}/`)
}

export const MIGAS_INVENTARIO = {
  areasVerdes: { texto: 'Áreas verdes', ruta: RUTAS_INVENTARIO.areasVerdes },
  mapa: { texto: 'Mapa del campus', ruta: RUTAS_INVENTARIO.mapa },
  coberturas: { texto: 'Coberturas vegetales', ruta: RUTAS_INVENTARIO.coberturas },
  catalogos: { texto: 'Catálogos y sectores', ruta: RUTAS_INVENTARIO.catalogos },
} satisfies Record<string, Miga>

export const MIGAS_TERCERIZADOS = {
  serviciosTercerizados: { texto: 'Servicios tercerizados', ruta: RUTAS_TERCERIZADOS.atenciones },
  atenciones: { texto: 'Atenciones', ruta: RUTAS_TERCERIZADOS.atenciones },
  proveedoresContratos: { texto: 'Proveedores y contratos', ruta: RUTAS_TERCERIZADOS.proveedoresContratos },
  controlFitosanitario: { texto: 'Control fitosanitario', ruta: RUTAS_TERCERIZADOS.controlFitosanitario },
} satisfies Record<string, Miga>

// --- MOD-01 «Core y seguridad» -------------------------------------------------------------------------

const BASE_USUARIOS = '/usuarios-roles'

export const RUTAS_CORE = {
  ingreso: '/ingreso', // RF-T-001
  cambiarContrasena: '/cambiar-contrasena', // HU-MOD01-003
  usuarios: `${BASE_USUARIOS}/usuarios`, // RF-T-002 y RF-T-003
  accesos: `${BASE_USUARIOS}/accesos`, // CU-MOD01-007
  repositorio: '/repositorio', // RF-T-010
} as const

/** Prefijo de «Usuarios y roles» (menú). */
export const PREFIJO_USUARIOS = BASE_USUARIOS

export function rutaDetalleUsuario(id: number | string): string {
  return `${RUTAS_CORE.usuarios}/${id}`
}

export const MIGAS_CORE = {
  usuariosRoles: { texto: 'Usuarios y roles', ruta: RUTAS_CORE.usuarios },
  usuarios: { texto: 'Usuarios', ruta: RUTAS_CORE.usuarios },
  repositorio: { texto: 'Repositorio', ruta: RUTAS_CORE.repositorio },
} satisfies Record<string, Miga>

/**
 * Destino seguro tras iniciar sesión: cualquier ruta interna salvo el ingreso y el cambio de contraseña
 * (evita redirecciones abiertas con `?volver=`). Si no es válido, `null`: se va al inicio del rol.
 */
export function destinoTrasIngresoCore(volver: string | null | undefined): string | null {
  if (!volver || !volver.startsWith('/') || volver.startsWith('//') || volver.includes('\\')) return null
  if ([...volver].some((caracter) => caracter.charCodeAt(0) < 0x20)) return null
  const ruta = volver.split(/[?#]/)[0]
  if (ruta === RUTAS_CORE.ingreso || ruta === RUTAS_CORE.cambiarContrasena) return null
  return volver
}

/** Ruta de ingreso de MOD-01 que vuelve a `destino`. */
export function rutaIngresoCore(destino?: string): string {
  const seguro = destinoTrasIngresoCore(destino)
  return seguro && seguro !== '/' ? `${RUTAS_CORE.ingreso}?volver=${encodeURIComponent(seguro)}` : RUTAS_CORE.ingreso
}
