import { PREFIJO_REDISENO } from '../prefijo'

export const SEGMENTO_MAPA = 'mapa'
export const RUTA_MAPA = `${PREFIJO_REDISENO}/${SEGMENTO_MAPA}`

export function rutaMapa(): string {
  return RUTA_MAPA
}
