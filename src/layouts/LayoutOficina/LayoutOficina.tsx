/**
 * Layout de la aplicación web de oficina, según el sistema de diseño de Figma (DESIGN.md, 4.3 y 5).
 *
 * Zonas: menú lateral de 256px (izquierda, a toda la altura), cabecera de 52px con las migas y contenido con
 * margen de 32px y ancho máximo de 1440px. El contenido empieza por el título de la página (h1, estilo
 * Título página), que cada página declara con `usePaginaActual`. Incluye el enlace «Saltar al contenido».
 */
import { useCallback, useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { esRutaCampo } from '../../router/rutasCampo'
import Cabecera from './Cabecera'
import { ContextoPagina, type DatosPagina } from './ContextoPagina'
import MenuLateral from './MenuLateral'
import estilos from './LayoutOficina.module.css'

/** Preferencia de menú comprimido: comodidad por navegador, sin datos de la sesión. */
const CLAVE_MENU_COMPRIMIDO = 'areas-verdes:menu-comprimido'

function leerComprimido(): boolean {
  try {
    return window.localStorage.getItem(CLAVE_MENU_COMPRIMIDO) === '1'
  } catch {
    return false
  }
}

function guardarComprimido(valor: boolean) {
  try {
    window.localStorage.setItem(CLAVE_MENU_COMPRIMIDO, valor ? '1' : '0')
  } catch {
    // Sin almacenamiento (modo privado): la preferencia dura solo esta visita.
  }
}

export default function LayoutOficina() {
  const enCampo = esRutaCampo(useLocation().pathname)
  const [pagina, establecerPagina] = useState<DatosPagina>({ titulo: '', migas: [] })
  const valor = useMemo(() => ({ pagina, establecerPagina }), [pagina])
  const [comprimido, setComprimido] = useState(leerComprimido)
  const alternarComprimido = useCallback(() => {
    setComprimido((actual) => {
      guardarComprimido(!actual)
      return !actual
    })
  }, [])

  return (
    <ContextoPagina.Provider value={valor}>
      <a href="#contenido" className={estilos.saltar}>
        Saltar al contenido
      </a>
      <div
        className={[estilos.layout, enCampo && estilos.campo, comprimido && estilos.menuComprimido].filter(Boolean).join(' ')}
      >
        <MenuLateral comprimido={comprimido} onAlternarComprimido={alternarComprimido} />
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
