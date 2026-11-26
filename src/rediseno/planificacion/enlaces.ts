import { PREFIJO_REDISENO } from '../prefijo'

export const SEGMENTO_PLANIFICACION = 'planificacion'
export const RUTA_PLANIFICACION = `${PREFIJO_REDISENO}/${SEGMENTO_PLANIFICACION}`

export function rutaPlanificacion(): string {
  return RUTA_PLANIFICACION
}
