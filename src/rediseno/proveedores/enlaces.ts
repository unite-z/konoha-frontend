import { PREFIJO_REDISENO } from '../prefijo'

export const SEGMENTO_PROVEEDORES = 'proveedores'
export const RUTA_PROVEEDORES = `${PREFIJO_REDISENO}/${SEGMENTO_PROVEEDORES}`

export function rutaProveedores(): string {
  return RUTA_PROVEEDORES
}
