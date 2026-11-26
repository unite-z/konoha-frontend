import { PREFIJO_REDISENO } from '../prefijo'

export const SEGMENTO_PLANIFICACION = 'planificacion'
export const RUTA_PLANIFICACION = `${PREFIJO_REDISENO}/${SEGMENTO_PLANIFICACION}`
export const SEGMENTO_CICLOS = 'ciclos'
export const SEGMENTO_CUADRILLAS = 'cuadrillas'
export const SEGMENTO_REGLAS = 'reglas'

/** Sectores: la entrada de Planificación. */
export function rutaPlanificacion(): string {
  return RUTA_PLANIFICACION
}

/** Programar un ciclo (panel de RD-31); con `servicioId`, con ese servicio elegido. */
export function rutaPlanificacionProgramar(servicioId?: number): string {
  return `${RUTA_PLANIFICACION}?programar=${servicioId ?? 1}`
}

/** Lista de ciclos con el panel del ciclo abierto (RD-29). */
export function rutaPlanificacionCiclo(cicloId: number): string {
  return `${RUTA_PLANIFICACION}/${SEGMENTO_CICLOS}?ciclo=${cicloId}`
}

export function rutaPlanificacionCiclos(): string {
  return `${RUTA_PLANIFICACION}/${SEGMENTO_CICLOS}`
}

export function rutaPlanificacionCuadrillas(): string {
  return `${RUTA_PLANIFICACION}/${SEGMENTO_CUADRILLAS}`
}

/** Reglas del ciclo (servicios periódicos y restricciones). */
export function rutaPlanificacionReglas(): string {
  return `${RUTA_PLANIFICACION}/${SEGMENTO_REGLAS}`
}

/** Sectores con el panel del sector abierto (RD-41). */
export function rutaPlanificacionSector(sectorId: number): string {
  return `${RUTA_PLANIFICACION}?sector=${sectorId}`
}
