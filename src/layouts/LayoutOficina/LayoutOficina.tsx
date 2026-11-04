/**
 * Layout de la aplicación web de oficina, según el sistema de diseño de Figma (DESIGN.md, 4.3 y 5).
 *
 * Zonas: menú lateral de 288px, o 92px comprimido (izquierda, a toda la altura), cabecera de 52px con las
 * migas y contenido con margen de 32px y ancho máximo de 1440px. El contenido empieza por el título de la página (h1, estilo
 * Título página), que cada página declara con `usePaginaActual`; su acción principal va a la derecha del
 * título con `AccionesPagina`. Incluye el enlace «Saltar al contenido».
 *
 * Por debajo de 768px: Barra superior móvil en lugar de la cabecera, menú lateral como panel sobre velo
 * (se cierra con su botón, el velo, Esc o al navegar; el resto queda inerte) y Barra inferior con las
 * secciones del módulo activo.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { BarraInferior, BarraSuperiorMovil } from './BarrasMoviles'
import Cabecera from './Cabecera'
import { ContextoPagina, type DatosPagina } from './ContextoPagina'
import MenuLateral from './MenuLateral'
import estilos from './LayoutOficina.module.css'

/** Preferencia de menú fijado abierto: comodidad por navegador, sin datos de la sesión. Por defecto, comprimido. */
const CLAVE_MENU_COMPRIMIDO = 'areas-verdes:menu-comprimido'

function leerComprimido(): boolean {
  try {
    return window.localStorage.getItem(CLAVE_MENU_COMPRIMIDO) !== '0'
  } catch {
    return true
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
  const { pathname } = useLocation()
  const [pagina, establecerPagina] = useState<DatosPagina>({ titulo: '', migas: [] })
  const [nodoAcciones, setNodoAcciones] = useState<HTMLElement | null>(null)
  const [nodoJunto, setNodoJunto] = useState<HTMLElement | null>(null)
  const [nodoAccionMovil, setNodoAccionMovil] = useState<HTMLElement | null>(null)
  const valor = useMemo(
    () => ({ pagina, establecerPagina, nodoAcciones, nodoJunto, nodoAccionMovil }),
    [pagina, nodoAcciones, nodoJunto, nodoAccionMovil],
  )
  const [comprimido, setComprimido] = useState(leerComprimido)
  const alternarComprimido = useCallback(() => {
    setComprimido((actual) => {
      guardarComprimido(!actual)
      return !actual
    })
  }, [])

  // Menú como panel en móvil: se cierra al cambiar de página (ajuste durante el render) y con Esc.
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [rutaAnterior, setRutaAnterior] = useState(pathname)
  if (rutaAnterior !== pathname) {
    setRutaAnterior(pathname)
    setMenuAbierto(false)
  }
  useEffect(() => {
    if (!menuAbierto) return
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setMenuAbierto(false)
    }
    document.addEventListener('keydown', alPulsar)
    return () => document.removeEventListener('keydown', alPulsar)
  }, [menuAbierto])

  return (
    <ContextoPagina.Provider value={valor}>
      <a href="#contenido" className={estilos.saltar}>
        Saltar al contenido
      </a>
      <div
        className={[estilos.layout, comprimido && estilos.menuComprimido, menuAbierto && estilos.menuAbierto]
          .filter(Boolean)
          .join(' ')}
      >
        <MenuLateral
          comprimido={comprimido}
          onAlternarComprimido={alternarComprimido}
          onCerrarMovil={() => setMenuAbierto(false)}
        />
        {menuAbierto && <div className={estilos.velo} aria-hidden="true" onClick={() => setMenuAbierto(false)} />}
        <div className={estilos.columna} inert={menuAbierto}>
          <BarraSuperiorMovil titulo={pagina.titulo} onAbrirMenu={() => setMenuAbierto(true)} refAccion={setNodoAccionMovil} />
          <Cabecera migas={pagina.migas} />
          <main id="contenido" tabIndex={-1} className={estilos.contenido}>
            {pagina.titulo && pagina.tituloOculto && <h1 className="sr-only">{pagina.titulo}</h1>}
            {pagina.titulo && !pagina.tituloOculto && (
              <div className={estilos.filaTitulo}>
                {pagina.subtitulo ? (
                  <div>
                    <div className={estilos.lineaTitulo}>
                      <h1 className={estilos.titulo}>{pagina.titulo}</h1>
                      <span ref={setNodoJunto} className={estilos.juntoTitulo} />
                    </div>
                    <p className={estilos.subtitulo}>{pagina.subtitulo}</p>
                  </div>
                ) : (
                  <>
                    <h1 className={estilos.titulo}>{pagina.titulo}</h1>
                    <span ref={setNodoJunto} className={`${estilos.juntoTitulo} ${estilos.juntoSinSubtitulo}`} />
                  </>
                )}
                <div ref={setNodoAcciones} className={estilos.accionesTitulo} />
              </div>
            )}
            <Outlet />
          </main>
          <BarraInferior />
        </div>
      </div>
    </ContextoPagina.Provider>
  )
}
