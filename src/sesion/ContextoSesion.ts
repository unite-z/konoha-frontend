/**
 * Contexto de la sesión de MOD-01 (RF-T-001). La sesión vive en una cookie `HttpOnly`: aquí solo se
 * guarda lo que devuelve `GET auth/sesion/` (usuario, rol y permisos), en memoria.
 */
import { createContext, useContext } from 'react'
import type { Rol } from '../config/sesion'
import type { ErrorApi } from '../services/api/cliente'
import type { Credenciales, SesionCore } from '../types/core'

export type EstadoSesion =
  /** Comprobando si hay una sesión abierta (al cargar la aplicación). */
  | { tipo: 'verificando' }
  /** Sin sesión. `motivo`: `cerrada` si la cerró el usuario, `perdida` si caducó o la cuenta se desactivó. */
  | { tipo: 'anonima'; motivo?: 'cerrada' | 'perdida' }
  | { tipo: 'activa'; sesion: SesionCore }
  /** No se pudo comprobar la sesión (sin conexión o error del servidor). */
  | { tipo: 'error'; error: ErrorApi }

export interface ValorSesion {
  estado: EstadoSesion
  /** Abre la sesión. Lanza `ErrorApi` con el mensaje del servidor si no se puede. */
  ingresar: (credenciales: Credenciales) => Promise<SesionCore>
  cerrarSesion: () => Promise<void>
  /** Vuelve a leer la sesión (tras cambiar la contraseña o tras un error). */
  recargar: () => Promise<void>
}

export const ContextoSesion = createContext<ValorSesion | null>(null)

export function useSesion(): ValorSesion {
  const valor = useContext(ContextoSesion)
  if (!valor) throw new Error('useSesion debe usarse dentro de ProveedorSesion')
  return valor
}

/** Sesión activa o `null`. */
export function useSesionActiva(): SesionCore | null {
  const { estado } = useSesion()
  return estado.tipo === 'activa' ? estado.sesion : null
}

/** Nombre del rol de la sesión (el que usan los permisos de interfaz de MOD-06), o `null` sin sesión. */
export function useRolActual(): Rol | null {
  return (useSesionActiva()?.rol.nombre as Rol | undefined) ?? null
}
