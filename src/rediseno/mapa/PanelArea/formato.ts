import type { EntradaHistorialArea, TipoEntradaHistorialArea } from '@/types/resumenArea'
import type { SituacionEjemplar } from '@/types/ejemplares'

export const NOMBRE_SITUACION: Record<SituacionEjemplar, string> = {
  activo: 'Activos',
  retirado: 'Retirados',
  muerto: 'Muertos',
  reemplazado: 'Reemplazados',
  trasladado: 'Trasladados',
}

export const NOMBRE_SITUACION_SINGULAR: Record<SituacionEjemplar, string> = {
  activo: 'Activo',
  retirado: 'Retirado',
  muerto: 'Muerto',
  reemplazado: 'Reemplazado',
  trasladado: 'Trasladado',
}

export const NOMBRE_TIPO_HISTORIAL: Record<TipoEntradaHistorialArea, string> = {
  actividad: 'Actividad',
  incidencia: 'Incidencia',
  atencion: 'Atención',
  cambio_sector: 'Cambio de sector',
}

export const nombreSituacion = (situacion: string): string =>
  NOMBRE_SITUACION[situacion as SituacionEjemplar] ?? situacion

export const nombreSituacionSingular = (situacion: string): string =>
  NOMBRE_SITUACION_SINGULAR[situacion as SituacionEjemplar] ?? situacion

export const nombreTipoHistorial = (entrada: EntradaHistorialArea): string =>
  NOMBRE_TIPO_HISTORIAL[entrada.tipo] ?? entrada.tipo

/** Texto de la prioridad tal como llega («Alta», «media»…), con la primera en mayúscula. */
export const prioridadLegible = (prioridad: string): string =>
  prioridad.length === 0 ? prioridad : prioridad[0].toUpperCase() + prioridad.slice(1).toLowerCase()
