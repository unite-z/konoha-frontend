/**
 * Cabecera global (Guía Web 3.2 y mockup, pantalla 2): alto de 64px, fondo blanco y borde inferior.
 * Izquierda: migas de pan sobre el título de la página (h1). Derecha: búsqueda global y usuario con su rol.
 *
 * Usuario mostrado: el de la sesión de MOD-01, con «Cambiar contraseña» y «Cerrar sesión» (toda la aplicación
 * entra por esa sesión desde AV-234).
 */
import type { ReactNode } from 'react'
import { RUTAS_CORE } from '../../router/rutasApp'
import Boton, { BotonEnlace } from '../../components/ui/Boton'
import { useSesion } from '../../sesion/ContextoSesion'
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

interface DatosUsuarioVisible {
  nombre: string
  rol: string
}

function BloqueUsuario({
  usuario,
  onCerrarSesion,
  conCambioContrasena = false,
}: {
  usuario: DatosUsuarioVisible
  onCerrarSesion?: () => void
  conCambioContrasena?: boolean
}) {
  return (
    <div className={estilos.usuario}>
      <span className={estilos.iniciales} aria-hidden="true">
        {iniciales(usuario.nombre)}
      </span>
      <span className={estilos.datosUsuario}>
        <span className={estilos.nombre}>{usuario.nombre}</span>
        <span className={estilos.rol}>{usuario.rol}</span>
      </span>
      {conCambioContrasena && (
        <BotonEnlace to={RUTAS_CORE.cambiarContrasena} variante="terciario" compacto>
          Cambiar contraseña
        </BotonEnlace>
      )}
      {onCerrarSesion && (
        <Boton variante="terciario" compacto onClick={onCerrarSesion}>
          Cerrar sesión
        </Boton>
      )}
    </div>
  )
}

export default function Cabecera({ titulo, migas }: CabeceraProps) {
  const { estado: sesionCore, cerrarSesion: cerrarSesionCore } = useSesion()
  const bloque: ReactNode =
    sesionCore.tipo === 'activa' ? (
      <BloqueUsuario
        usuario={{ nombre: sesionCore.sesion.usuario.nombre, rol: sesionCore.sesion.rol.nombre }}
        onCerrarSesion={() => void cerrarSesionCore()}
        conCambioContrasena
      />
    ) : null

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
        {bloque}
      </div>
    </header>
  )
}
