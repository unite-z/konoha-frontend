import { PREFIJO_REDISENO } from '../prefijo'

export const SEGMENTO_INCIDENCIAS = 'incidencias'
export const RUTA_INCIDENCIAS = `${PREFIJO_REDISENO}/${SEGMENTO_INCIDENCIAS}`

export function rutaIncidencias(): string {
  return RUTA_INCIDENCIAS
}
