import { PREFIJO_REDISENO } from '../prefijo'

export const SEGMENTO_REPORTES = 'reportes'
export const RUTA_REPORTES = `${PREFIJO_REDISENO}/${SEGMENTO_REPORTES}`

export function rutaReportes(): string {
  return RUTA_REPORTES
}
