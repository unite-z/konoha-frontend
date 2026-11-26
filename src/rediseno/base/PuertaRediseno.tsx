import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router'
import Boton, { BotonEnlace } from '@/design-system/Boton'
import EstadoVacio from '@/design-system/EstadoVacio'
import { PREFIJO_REDISENO } from '../prefijo'
import { useDisenoNuevo } from '../usarDisenoNuevo'

/**
 * Con el interruptor encendido, la ruta antigua que envuelve lleva a su equivalente `/n/…`; apagado o sin elegir,
 * la deja como está. Hasta RD-05 solo se envuelve `/`.
 */
export default function PuertaRediseno({ children }: { children: ReactNode }) {
  const { encendido } = useDisenoNuevo()
  return encendido ? <Navigate to={PREFIJO_REDISENO} replace /> : children
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
