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

/**
 * Programar un ciclo (panel de RD-31), con el contrato actual de `?programar=` (AV-267): el valor es el id del
 * servicio elegido, o vacío para abrir el panel sin elegir. `atiende` (alerta de frecuencia) añade `&atiende=1`.
 */
export function rutaPlanificacionProgramar(opciones: { servicioId?: number; atiende?: boolean } = {}): string {
  const parametros = new URLSearchParams({
    programar: opciones.servicioId === undefined ? '' : String(opciones.servicioId),
  })
  if (opciones.atiende) parametros.set('atiende', '1')
  return `${RUTA_PLANIFICACION}?${parametros.toString()}`
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

/** Parámetro del panel de revisión de «Konoha propone» (RD-33); RD-32 lo lee para pintar la capa en el calendario. */
export const PARAMETRO_PROPUESTA = 'propuesta'

/** Sectores con el panel de revisión de la propuesta de cronograma abierto (RD-33). */
export function rutaPlanificacionPropuesta(propuestaId: number): string {
  return `${RUTA_PLANIFICACION}?${PARAMETRO_PROPUESTA}=${propuestaId}`
}
