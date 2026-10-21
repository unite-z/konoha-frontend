/**
 * Contexto de la sesión de MOD-05 (usuario Django autenticado con HTTP Basic).
 * MOD-06 sigue usando la sesión simulada de `config/sesion.ts`.
 */
import { createContext, useContext } from 'react'
import type { ErrorApi } from '../services/api/cliente'
import type { UsuarioActual } from '../types/tercerizados'

export type EstadoSesionTercerizados =
  /** No hay credenciales: hay que ingresar. `cerrada`: el usuario cerró la sesión (no se guarda destino). */
  | { tipo: 'sin-sesion'; cerrada?: boolean }
  /** Hay credenciales guardadas y se están comprobando con `GET me/`. */
  | { tipo: 'verificando' }
  /** Credenciales válidas. `usuario.rol` puede ser `null` (usuario sin acceso al módulo). */
  | { tipo: 'activa'; usuario: UsuarioActual }
  /** No se pudo comprobar la sesión guardada (sin conexión o error del servidor). Se conserva. */
  | { tipo: 'error'; error: ErrorApi }

export interface ValorSesionTercerizados {
  estado: EstadoSesionTercerizados
  /** Comprueba las credenciales y, si son válidas, abre la sesión. Lanza `ErrorApi` si no. */
  ingresar: (usuario: string, clave: string) => Promise<UsuarioActual>
  /** Borra las credenciales de esta pestaña. El guardián lleva al ingreso. */
  cerrarSesion: () => void
  /** Repite la comprobación de la sesión guardada (tras un error). */
  reintentar: () => void
}

export const ContextoSesionTercerizados = createContext<ValorSesionTercerizados | null>(null)

export function useSesionTercerizados(): ValorSesionTercerizados {
  const valor = useContext(ContextoSesionTercerizados)
  if (!valor) throw new Error('useSesionTercerizados debe usarse dentro de ProveedorSesionTercerizados')
  return valor
}
