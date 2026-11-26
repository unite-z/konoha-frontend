import { useLayoutEffect } from 'react'
import { Outlet } from 'react-router'
import estilos from './LayoutRediseno.module.css'

/** Marco mínimo del diseño nuevo: mientras está montado, el tema amarillento; al salir, el que había. RD-04 añade la cabecera. */
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
    <main className={estilos.raiz}>
      <Outlet />
    </main>
  )
}
