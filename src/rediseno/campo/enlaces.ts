import { PREFIJO_REDISENO } from '../prefijo'

export const SEGMENTO_CAMPO = 'campo'
export const RUTA_CAMPO = `${PREFIJO_REDISENO}/${SEGMENTO_CAMPO}`

export function rutaCampo(): string {
  return RUTA_CAMPO
}
