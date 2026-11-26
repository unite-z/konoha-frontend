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

/** Estados que el historial trae en código (de incidencias, actividades, atenciones y sectores), en texto legible. */
const ESTADO_LEGIBLE: Record<string, string> = {
  vigente: 'Vigente',
  finalizada: 'Finalizada',
  DerivadaInterna: 'Derivada a personal propio',
  DerivadaTercerizada: 'Derivada a un proveedor',
  EnAtencion: 'En atención',
  EnCurso: 'En curso',
  EnProceso: 'En proceso',
}

/** El estado de la tabla; si no está, el que llega, separado en palabras si viene en CamelCase («PorIniciar»). */
export function estadoLegible(estado: string): string {
  const conocido = ESTADO_LEGIBLE[estado]
  if (conocido) return conocido
  const palabras = estado.replace(/([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g, '$1 $2')
  return palabras === estado ? estado : palabras[0] + palabras.slice(1).toLowerCase()
}
