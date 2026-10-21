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
