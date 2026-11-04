/**
 * Navegación móvil del sistema de diseño de Figma (DESIGN.md, 4.3 y 5): «Barra superior móvil» y
 * «Barra inferior» con «Pestaña inferior». Solo se ven por debajo de 768px (LayoutOficina.module.css).
 *
 * - Barra superior: botón que abre el menú lateral como panel y el título de la página (el h1 sigue en el
 *   contenido, así que aquí es texto).
 * - Barra inferior: las subentradas del módulo activo (como mucho 5), con icono y texto, y la actual marcada.
 */
import { Link, useLocation } from 'react-router'
import Icono from '@/components/ui/Icono'
import { activoEnMenu, seccionesMoviles } from './entradasMenuLateral'
import estilos from './BarrasMoviles.module.css'

export function BarraSuperiorMovil({
  titulo,
  onAbrirMenu,
  refAccion,
}: {
  titulo: string
  onAbrirMenu: () => void
  /** Hueco a la derecha donde `AccionMovil` pinta la acción de la página («+» del Calendario, Figma 352-2192). */
  refAccion?: (nodo: HTMLElement | null) => void
}) {
  return (
    <div className={estilos.superior}>
      <button type="button" className={estilos.botonMenu} aria-label="Abrir menú" onClick={onAbrirMenu}>
        <Icono nombre="menu" tamano="md" />
      </button>
      <span className={estilos.titulo}>{titulo}</span>
      <span ref={refAccion} className={estilos.accion} />
    </div>
  )
}

export function BarraInferior() {
  const { pathname } = useLocation()
  const secciones = seccionesMoviles(pathname)
  const { hijo: activa, modulo } = activoEnMenu(pathname)
  if (!modulo || secciones.length < 2) return null

  return (
    <nav className={estilos.inferior} aria-label={`Secciones de ${modulo.texto}`}>
      {secciones.map((seccion) => {
        const actual = seccion === activa
        return (
          <Link
            key={seccion.texto}
            to={seccion.ruta}
            className={`${estilos.pestana} ${actual ? estilos.actual : ''}`}
            aria-current={actual ? 'page' : undefined}
          >
            {seccion.icono && <Icono nombre={seccion.icono} tamano="md" />}
            <span>{seccion.textoMovil ?? seccion.texto}</span>
          </Link>
        )
      })}
    </nav>
  )
}
