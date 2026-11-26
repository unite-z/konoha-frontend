import { useLayoutEffect } from 'react'
import { Outlet } from 'react-router'
import { ProveedorEscenario, useMapaVisible } from './Escenario'
import estilos from './LayoutRediseno.module.css'

/**
 * Marco del diseño nuevo: mientras está montado, el tema amarillento; al salir, el que había. Lleva el escenario
 * persistente (AV-426): el mapa 3D detrás del contenido, visible solo en las vistas que lo piden con `useVistaDeMapa`.
 * RD-04 añade la cabecera.
 */
export default function LayoutRediseno() {
  useLayoutEffect(() => {
    const raiz = document.documentElement
    const anterior = raiz.dataset.tema
    raiz.dataset.tema = 'amarillento'
    return () => {
      if (anterior === undefined) delete raiz.dataset.tema
      else raiz.dataset.tema = anterior
    }
  }, [])
  return (
    <ProveedorEscenario>
      <Contenido />
    </ProveedorEscenario>
  )
}

function Contenido() {
  const conMapa = useMapaVisible()
  return (
    <main className={estilos.raiz} data-mapa={conMapa ? 'visible' : 'oculto'}>
      <Outlet />
    </main>
  )
}
