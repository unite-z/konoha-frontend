/**
 * Layout de la aplicación web de oficina (Guía Web, sección 3).
 * Layout temporal del MOD-06: se sustituirá por el layout común cuando el MOD-01 lo publique.
 *
 * Zonas: menú lateral de 256px (izquierda, a toda la altura), cabecera de 64px y contenido con margen de
 * 32px y ancho máximo de 1440px. Incluye el enlace «Saltar al contenido».
 */
import { useMemo, useState } from 'react'
import { Outlet } from 'react-router'
import Cabecera from './Cabecera'
import { ContextoPagina, type DatosPagina } from './ContextoPagina'
import MenuLateral from './MenuLateral'
import estilos from './LayoutOficina.module.css'

export default function LayoutOficina() {
  const [pagina, establecerPagina] = useState<DatosPagina>({ titulo: '', migas: [] })
  const valor = useMemo(() => ({ pagina, establecerPagina }), [pagina])

  return (
    <ContextoPagina.Provider value={valor}>
      <a href="#contenido" className={estilos.saltar}>
        Saltar al contenido
      </a>
      <div className={estilos.layout}>
        <MenuLateral />
        <div className={estilos.columna}>
          <Cabecera titulo={pagina.titulo} migas={pagina.migas} />
          <main id="contenido" tabIndex={-1} className={estilos.contenido}>
            <Outlet />
          </main>
        </div>
      </div>
    </ContextoPagina.Provider>
  )
}
