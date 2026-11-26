/** Reúne el `seccion.ts` de cada módulo: la cabecera y la barra inferior leen de aquí (RD-04). */
import { seccionCampo } from './campo/seccion'
import { seccionCuenta } from './cuenta/seccion'
import { seccionIncidencias } from './incidencias/seccion'
import { seccionMapa } from './mapa/seccion'
import { seccionPlanificacion } from './planificacion/seccion'
import { seccionProveedores } from './proveedores/seccion'
import { seccionReportes } from './reportes/seccion'
import type { SeccionRediseno } from './tipos'

/** Orden de la cabecera: Mapa, Planificación, Incidencias, Proveedores y Reportes; después cuenta y campo. */
export const SECCIONES_REDISENO: readonly SeccionRediseno[] = [
  seccionMapa,
  seccionPlanificacion,
  seccionIncidencias,
  seccionProveedores,
  seccionReportes,
  seccionCuenta,
  seccionCampo,
]

function visible(seccion: SeccionRediseno, permisos: readonly string[]): boolean {
  return seccion.permisos.length === 0 || seccion.permisos.some((p) => permisos.includes(p))
}

/** Secciones de la cabecera que los permisos dejan ver. */
export function seccionesDeCabecera(permisos: readonly string[]): SeccionRediseno[] {
  return SECCIONES_REDISENO.filter((s) => s.enCabecera && visible(s, permisos))
}

/** Secciones (cabecera o no) que los permisos dejan ver. */
export function seccionesVisibles(permisos: readonly string[]): SeccionRediseno[] {
  return SECCIONES_REDISENO.filter((s) => visible(s, permisos))
}
