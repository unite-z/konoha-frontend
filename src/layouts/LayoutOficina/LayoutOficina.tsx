/**
 * Layout de la aplicación web de oficina, según el sistema de diseño de Figma (DESIGN.md, 4.3 y 5).
 *
 * Zonas: menú lateral de 256px (izquierda, a toda la altura), cabecera de 52px con las migas y contenido con
 * margen de 32px y ancho máximo de 1440px. El contenido empieza por el título de la página (h1, estilo
 * Título página), que cada página declara con `usePaginaActual`. Incluye el enlace «Saltar al contenido».
 */
import { useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { esRutaCampo } from '../../router/rutasCampo'
import Cabecera from './Cabecera'
import { ContextoPagina, type DatosPagina } from './ContextoPagina'
import MenuLateral from './MenuLateral'
import estilos from './LayoutOficina.module.css'

export default function LayoutOficina() {
  const enCampo = esRutaCampo(useLocation().pathname)
  const [pagina, establecerPagina] = useState<DatosPagina>({ titulo: '', migas: [] })
  const valor = useMemo(() => ({ pagina, establecerPagina }), [pagina])

  return (
    <ContextoPagina.Provider value={valor}>
      <a href="#contenido" className={estilos.saltar}>
        Saltar al contenido
      </a>
      <div className={`${estilos.layout} ${enCampo ? estilos.campo : ''}`}>
        <MenuLateral />
        <div className={estilos.columna}>
          <Cabecera migas={pagina.migas} />
          <main id="contenido" tabIndex={-1} className={estilos.contenido}>
            {pagina.titulo && <h1 className={estilos.titulo}>{pagina.titulo}</h1>}
            <Outlet />
          </main>
        </div>
      </div>
    </ContextoPagina.Provider>
  )
}
