/**
 * Cabecera global (Guía Web 3.2 y mockup, pantalla 2): alto de 64px, fondo blanco y borde inferior.
 * Izquierda: migas de pan sobre el título de la página (h1). Derecha: búsqueda global y usuario con su rol.
 */
import { obtenerSesion } from '../../config/sesion'
import BarraContexto from './BarraContexto'
import type { Miga } from './ContextoPagina'
import estilos from './Cabecera.module.css'

/** Iniciales para el círculo del usuario («Robert G.» → «RG»). */
function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .map((parte) => parte.replace(/[^\p{L}]/gu, '').charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export interface CabeceraProps {
  titulo: string
  migas: Miga[]
}

export default function Cabecera({ titulo, migas }: CabeceraProps) {
  const sesion = obtenerSesion()
  return (
    <header className={estilos.cabecera}>
      <div className={estilos.titulos}>
        <BarraContexto migas={migas} />
        {titulo && <h1 className={estilos.titulo}>{titulo}</h1>}
      </div>
      <div className={estilos.derecha}>
        {/* TODO: búsqueda global (otro módulo). Se muestra deshabilitada. */}
        <input
          type="search"
          className={estilos.busqueda}
          placeholder="Buscar ejemplar, jardín, encargo o incidencia"
          aria-label="Buscar ejemplar, jardín, encargo o incidencia"
          disabled
        />
        <div className={estilos.usuario}>
          <span className={estilos.iniciales} aria-hidden="true">
            {iniciales(sesion.nombre)}
          </span>
          <span className={estilos.datosUsuario}>
            <span className={estilos.nombre}>{sesion.nombre}</span>
            <span className={estilos.rol}>{sesion.rol}</span>
          </span>
        </div>
      </div>
    </header>
  )
}
