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
  ingreso: `${BASE_TERCERIZADOS}/ingreso`,
  atenciones: `${BASE_TERCERIZADOS}/atenciones`,
  nuevaAtencion: `${BASE_TERCERIZADOS}/atenciones/nueva`, // RF-SER-003
} as const

/** Ficha de una atención tercerizada. */
export function rutaDetalleAtencion(id: number | string): string {
  return `${RUTAS_TERCERIZADOS.atenciones}/${id}`
}

/** `true` si la ruta pertenece a MOD-05. */
export function esRutaTercerizados(ruta: string): boolean {
  return ruta === BASE_TERCERIZADOS || ruta.startsWith(`${BASE_TERCERIZADOS}/`)
}

/**
 * Destino seguro tras ingresar: solo rutas internas de MOD-05 distintas del ingreso (evita redirecciones
 * abiertas a otros sitios con `?volver=`). Si no es válido, la bandeja de atenciones.
 */
export function destinoTrasIngreso(volver: string | null | undefined): string {
  if (!volver || !volver.startsWith('/') || volver.startsWith('//') || volver.includes('\\')) {
    return RUTAS_TERCERIZADOS.atenciones
  }
  const ruta = volver.split(/[?#]/)[0]
  const tieneControl = [...volver].some((caracter) => caracter.charCodeAt(0) < 0x20)
  if (!esRutaTercerizados(ruta) || ruta === RUTAS_TERCERIZADOS.ingreso || tieneControl) {
    return RUTAS_TERCERIZADOS.atenciones
  }
  return volver
}

/** Ruta de ingreso que vuelve a `destino` tras autenticarse. */
export function rutaIngreso(destino?: string): string {
  if (!destino || destinoTrasIngreso(destino) !== destino) return RUTAS_TERCERIZADOS.ingreso
  return `${RUTAS_TERCERIZADOS.ingreso}?volver=${encodeURIComponent(destino)}`
}

export const MIGAS_TERCERIZADOS = {
  serviciosTercerizados: { texto: 'Servicios tercerizados', ruta: RUTAS_TERCERIZADOS.atenciones },
  atenciones: { texto: 'Atenciones', ruta: RUTAS_TERCERIZADOS.atenciones },
} satisfies Record<string, Miga>
