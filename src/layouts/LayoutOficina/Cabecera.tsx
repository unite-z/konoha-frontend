/**
 * Cabecera global (Guía Web 3.2 y mockup, pantalla 2): alto de 64px, fondo blanco y borde inferior.
 * Izquierda: migas de pan sobre el título de la página (h1). Derecha: búsqueda global y usuario con su rol.
 *
 * Usuario mostrado:
 * - En rutas de MOD-05: el usuario real de su sesión, con «Cerrar sesión» (el guardián lleva al ingreso).
 *   Sin sesión, no se muestra nadie.
 * - En el resto (MOD-06): el usuario simulado de `config/sesion.ts`, como hasta ahora.
 */
import type { ReactNode } from 'react'
import { useLocation } from 'react-router'
import { obtenerSesion } from '../../config/sesion'
import { esRutaTercerizados } from '../../router/rutasApp'
import Boton from '../../components/ui/Boton'
import { useSesionTercerizados } from '../../sesion/ContextoSesionTercerizados'
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

/** Texto del rol de un usuario de MOD-05 sin rol del módulo. */
const SIN_ROL_MODULO = 'Sin acceso al módulo'

interface DatosUsuarioVisible {
  nombre: string
  rol: string
}

function BloqueUsuario({ usuario, onCerrarSesion }: { usuario: DatosUsuarioVisible; onCerrarSesion?: () => void }) {
  return (
    <div className={estilos.usuario}>
      <span className={estilos.iniciales} aria-hidden="true">
        {iniciales(usuario.nombre)}
      </span>
      <span className={estilos.datosUsuario}>
        <span className={estilos.nombre}>{usuario.nombre}</span>
        <span className={estilos.rol}>{usuario.rol}</span>
      </span>
      {onCerrarSesion && (
        <Boton variante="terciario" compacto onClick={onCerrarSesion}>
          Cerrar sesión
        </Boton>
      )}
    </div>
  )
}

export default function Cabecera({ titulo, migas }: CabeceraProps) {
  const { pathname } = useLocation()
  const sesionTercerizados = useSesionTercerizados()
  const enTercerizados = esRutaTercerizados(pathname)

  let bloque: ReactNode = <BloqueUsuario usuario={obtenerSesion()} />
  if (enTercerizados) {
    const { estado, cerrarSesion } = sesionTercerizados
    bloque =
      estado.tipo === 'activa' ? (
        <BloqueUsuario
          usuario={{ nombre: estado.usuario.nombre, rol: estado.usuario.rol ?? SIN_ROL_MODULO }}
          onCerrarSesion={cerrarSesion}
        />
      ) : null
  }

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
