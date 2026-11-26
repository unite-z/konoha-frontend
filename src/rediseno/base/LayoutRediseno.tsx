import { useLayoutEffect } from 'react'
import { Outlet } from 'react-router'
import AvisoNuevaVersion from '@/sincronizacion/AvisoNuevaVersion'
import BarraInferior from './BarraInferior/BarraInferior'
import Cabecera from './Cabecera/Cabecera'
import { ProveedorEscenario, useMapaVisible } from './Escenario'
import estilos from './LayoutRediseno.module.css'

/**
 * Marco del diseño nuevo: mientras está montado, el tema amarillento; al salir, el que había. Lleva el escenario
 * persistente (AV-426): el mapa 3D detrás del contenido, visible solo en las vistas que lo piden con `useVistaDeMapa`,
 * la cabecera de vidrio y la barra inferior única del móvil (RD-04).
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
    <>
      <a href="#contenido-rediseno" className={estilos.saltar}>
        Saltar al contenido
      </a>
      <Cabecera />
      <main
        id="contenido-rediseno"
        tabIndex={-1}
        className={estilos.raiz}
        data-mapa={conMapa ? 'visible' : 'oculto'}
      >
        <AvisoNuevaVersion />
        <Outlet />
      </main>
      <BarraInferior />
    </>
  )
}
