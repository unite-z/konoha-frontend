/**
 * Textos y tonos de los valores estables de MOD-01. La API envía códigos; la interfaz decide la etiqueta.
 */
import type { Tono } from '../components/ui/tonos'
import type { CodigoRol, Destacado, EstadoCuenta, ResultadoAcceso } from '../types/core'

export const NOMBRE_ROL: Record<CodigoRol, string> = {
  'jefe-seccion': 'Jefe de sección',
  'ingeniero-campo': 'Ingeniero de campo',
  practicante: 'Practicante',
  capataz: 'Capataz',
  operario: 'Operario',
}

/** Roles asignables en esta fase (el operario está previsto, sin acceso: RS-004). */
export const ROLES_ASIGNABLES: CodigoRol[] = ['jefe-seccion', 'ingeniero-campo', 'practicante', 'capataz']

export const ESTADO_CUENTA: Record<EstadoCuenta, { texto: string; tono: Tono }> = {
  activa: { texto: 'Activa', tono: 'exito' },
  inactiva: { texto: 'Inactiva', tono: 'neutral' },
  bloqueada: { texto: 'Bloqueada', tono: 'error' },
}

export const DESTACADO: Record<Destacado, { texto: string; ayuda: string }> = {
  'sin-uso': { texto: 'Sin uso', ayuda: 'Sin acceso en los últimos 60 días: candidata a desactivar' },
  'vence-pronto': { texto: 'Vence pronto', ayuda: 'La vigencia termina en los próximos 7 días' },
  rechazos: { texto: 'Rechazos', ayuda: 'Varios intentos sin permiso en los últimos 30 días' },
}

export const RESULTADO_ACCESO: Record<ResultadoAcceso, { texto: string; tono: Tono }> = {
  Exitoso: { texto: 'Inicio correcto', tono: 'exito' },
  Fallido: { texto: 'Inicio fallido', tono: 'advertencia' },
  Bloqueado: { texto: 'Cuenta bloqueada', tono: 'error' },
  Denegado: { texto: 'Acceso denegado', tono: 'error' },
  SinPermiso: { texto: 'Sin permiso', tono: 'error' },
  CierreSesion: { texto: 'Cierre de sesión', tono: 'neutral' },
}

const ACCION: Record<string, string> = {
  Alta: 'Alta',
  Modificacion: 'Modificación',
  CambioEstado: 'Cambio de estado',
  CambioRol: 'Cambio de rol',
  BajaLogica: 'Baja',
}

export function textoAccion(accion: string): string {
  return ACCION[accion] ?? accion
}

/** Resumen legible de un cambio: «rol: practicante → ingeniero-campo; telefono: — → 999». */
export function resumenCambio(antes: Record<string, unknown>, despues: Record<string, unknown>): string {
  const claves = [...new Set([...Object.keys(antes), ...Object.keys(despues)])]
  return claves
    .map((clave) => {
      const nuevo = texto(despues[clave])
      return clave in antes ? `${clave}: ${texto(antes[clave])} → ${nuevo}` : `${clave}: ${nuevo}`
    })
    .join('; ')
}

function texto(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '—'
  if (typeof valor === 'string' && valor in NOMBRE_ROL) return NOMBRE_ROL[valor as CodigoRol]
  if (typeof valor === 'boolean') return valor ? 'sí' : 'no'
  return typeof valor === 'object' ? JSON.stringify(valor) : String(valor)
}
