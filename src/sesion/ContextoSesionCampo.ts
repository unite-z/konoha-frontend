import { createContext, useContext } from 'react'
import type { UsuarioCampo } from '../types/operacionCampo'

export interface SesionCampo {
  usuario: UsuarioCampo | null
  verificando: boolean
  error: string | null
  ingresar: (nombre: string, clave: string) => Promise<void>
  cerrarSesion: () => void
  reintentar: () => void
}
export const ContextoSesionCampo = createContext<SesionCampo | null>(null)
export function useSesionCampo(): SesionCampo {
  const value = useContext(ContextoSesionCampo)
  if(!value) throw new Error('Falta el proveedor de sesión de campo')
  return value
}
