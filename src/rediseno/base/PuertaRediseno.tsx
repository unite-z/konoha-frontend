import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import Boton, { BotonEnlace } from '@/design-system/Boton'
import EstadoVacio from '@/design-system/EstadoVacio'
import { useDisenoNuevo } from '../useDisenoNuevo'
import { destinoRediseno } from './redirecciones'

/**
 * Envuelve el layout actual. Con el interruptor encendido, cada ruta antigua con equivalente en `redirecciones.ts`
 * lleva a su `/n/…` y conserva la consulta; apagado o sin elegir, todo queda como está.
 */
export default function PuertaRediseno({ children }: { children: ReactNode }) {
  const { encendido } = useDisenoNuevo()
  const { pathname, search, hash } = useLocation()
  const destino = encendido ? destinoRediseno(pathname) : null
  return destino ? <Navigate to={{ pathname: destino, search, hash }} replace /> : children
}

/** Puerta de `/n`: encendido deja pasar; apagado o sin elegir, avisa y ofrece activarlo o volver. */
export function PuertaPrefijo() {
  const { encendido, elegir } = useDisenoNuevo()
  if (encendido) return <Outlet />
  return (
    <EstadoVacio
      centrado
      titulo="El diseño nuevo está desactivado"
      descripcion="Actívalo para verlo. Puedes volver al diseño actual cuando quieras desde Configuración › Apariencia."
      accion={
        <>
          <Boton onClick={() => void elegir(true).catch(() => undefined)}>Activar diseño nuevo</Boton>
          <BotonEnlace to="/" variante="secundario">
            Volver al diseño actual
          </BotonEnlace>
        </>
      }
    />
  )
}
