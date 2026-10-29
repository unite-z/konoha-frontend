/**
 * Validaciones de interfaz de MOD-01. Repiten las reglas del servidor para avisar antes de enviar; el
 * servidor vuelve a comprobarlas.
 */
import type { FechaIso } from '../types/comun'

/** Política de contraseñas de CU-MOD01-002 (supuesto ACC-S6). */
export const LONGITUD_MINIMA_CONTRASENA = 8

/** Reglas de la política que no cumple la contraseña (HU-MOD01-003, «Contraseña débil»). */
export function reglasIncumplidas(contrasena: string): string[] {
  const reglas: string[] = []
  if (contrasena.length < LONGITUD_MINIMA_CONTRASENA) {
    reglas.push(`Debe tener al menos ${LONGITUD_MINIMA_CONTRASENA} caracteres`)
  }
  if (!/\p{L}/u.test(contrasena)) reglas.push('Debe incluir al menos una letra')
  if (!/\p{Nd}/u.test(contrasena)) reglas.push('Debe incluir al menos un número')
  return reglas
}

export interface ErroresCambioContrasena {
  actual?: string
  nueva?: string
  confirmacion?: string
}

export function validarCambioContrasena(actual: string, nueva: string, confirmacion: string): ErroresCambioContrasena {
  const errores: ErroresCambioContrasena = {}
  if (!actual) errores.actual = 'Escribe tu contraseña actual'
  const reglas = reglasIncumplidas(nueva)
  if (!nueva) errores.nueva = 'Escribe la contraseña nueva'
  else if (reglas.length > 0) errores.nueva = reglas.join('. ')
  else if (nueva === actual) errores.nueva = 'Debe ser distinta de la contraseña actual'
  if (!confirmacion) errores.confirmacion = 'Repite la contraseña nueva'
  else if (confirmacion !== nueva) errores.confirmacion = 'No coincide con la contraseña nueva'
  return errores
}

export interface DatosCuenta {
  correo: string
  nombre: string
  telefono: string
  fecha_fin_vigencia: FechaIso | ''
}

export interface ErroresCuenta {
  correo?: string
  nombre?: string
  telefono?: string
  fecha_fin_vigencia?: string
}

const PATRON_CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/** `hoy` en `AAAA-MM-DD` (America/Lima), para no aceptar una vigencia ya vencida. */
export function validarCuenta(datos: DatosCuenta, hoy: FechaIso, conCorreo = true): ErroresCuenta {
  const errores: ErroresCuenta = {}
  const correo = datos.correo.trim()
  if (conCorreo) {
    if (!correo) errores.correo = 'Escribe el correo institucional'
    else if (!PATRON_CORREO.test(correo) || correo.length > 120) errores.correo = 'Escribe un correo válido'
  }
  if (!datos.nombre.trim()) errores.nombre = 'Escribe los nombres y apellidos'
  else if (datos.nombre.trim().length > 200) errores.nombre = 'Máximo 200 caracteres'
  if (datos.telefono.trim().length > 30) errores.telefono = 'Máximo 30 caracteres'
  if (datos.fecha_fin_vigencia && datos.fecha_fin_vigencia < hoy) {
    errores.fecha_fin_vigencia = 'La fecha de fin de vigencia no puede estar en el pasado'
  }
  return errores
}

/** Motivo obligatorio del cambio de rol o de la desactivación (HU-MOD01-006, CU-MOD01-004). */
export function validarMotivo(motivo: string): string | undefined {
  if (!motivo.trim()) return 'Indica el motivo'
  if (motivo.trim().length > 500) return 'Máximo 500 caracteres'
  return undefined
}
