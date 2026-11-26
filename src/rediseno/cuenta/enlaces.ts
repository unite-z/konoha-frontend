import { PREFIJO_REDISENO } from '../prefijo'

export const SEGMENTO_CUENTA = 'cuenta'
export const RUTA_CUENTA = `${PREFIJO_REDISENO}/${SEGMENTO_CUENTA}`

export function rutaCuenta(): string {
  return RUTA_CUENTA
}
