import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useDisenoNuevo } from '../useDisenoNuevo'

/**
 * Envuelve una pantalla actual de acceso (`/ingreso`, `/cambiar-contrasena`): con el interruptor «Diseño nuevo»
 * encendido, lleva a su equivalente de `/n` y conserva la consulta (`?volver=`). Antes de iniciar sesión solo se
 * conoce la preferencia del navegador; sin ella, se ve la pantalla de hoy.
 */
export default function RedirigirAlDisenoNuevo({ destino, children }: { destino: string; children: ReactNode }) {
  const { encendido } = useDisenoNuevo()
  const { search, hash } = useLocation()
  return encendido ? <Navigate to={{ pathname: destino, search, hash }} replace /> : children
}
