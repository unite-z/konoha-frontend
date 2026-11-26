import { destinoTrasIngresoCore } from '@/router/rutasApp'
import { PREFIJO_REDISENO } from '../prefijo'

export const SEGMENTO_CUENTA = 'cuenta'
export const RUTA_CUENTA = `${PREFIJO_REDISENO}/${SEGMENTO_CUENTA}`

export const SEGMENTO_INGRESO = 'ingreso'
export const SEGMENTO_CAMBIAR_CONTRASENA = 'cambiar-contrasena'
export const RUTA_INGRESO = `${PREFIJO_REDISENO}/${SEGMENTO_INGRESO}`
export const RUTA_CAMBIAR_CONTRASENA = `${PREFIJO_REDISENO}/${SEGMENTO_CAMBIAR_CONTRASENA}`
export const PARAM_VOLVER = 'volver'

export function rutaCuenta(): string {
  return RUTA_CUENTA
}

/** Destino interno tras entrar: nunca el ingreso ni el cambio de contraseña, de ninguno de los dos diseños. */
export function destinoSeguro(volver: string | null | undefined): string | null {
  const destino = destinoTrasIngresoCore(volver)
  if (destino === null) return null
  const ruta = destino.split(/[?#]/)[0]
  return ruta === RUTA_INGRESO || ruta === RUTA_CAMBIAR_CONTRASENA ? null : destino
}

/** Inicio de sesión del diseño nuevo; con `volver` (solo rutas internas), vuelve ahí al entrar. */
export function rutaIngreso(volver?: string): string {
  const seguro = destinoSeguro(volver)
  return seguro && seguro !== '/' ? `${RUTA_INGRESO}?${PARAM_VOLVER}=${encodeURIComponent(seguro)}` : RUTA_INGRESO
}

export function rutaCambiarContrasena(): string {
  return RUTA_CAMBIAR_CONTRASENA
}
