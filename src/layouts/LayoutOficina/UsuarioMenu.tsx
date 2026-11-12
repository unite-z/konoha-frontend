/**
 * Bloque de usuario al pie del «Menú lateral» de Figma (DESIGN.md, 4.3): avatar, nombre, rol y `⋮` con
 * «Cambiar contraseña» y «Cerrar sesión». Comprimido, solo se ve el avatar: lo demás se desvanece con los textos
 * del menú (`claseSeDesvanece`).
 *
 * Es un botón que muestra y oculta sus opciones (`aria-expanded`), en el orden natural del teclado. Se cierra con
 * Esc y al pulsar fuera.
 */
import { useEffect, useId, useRef, useState } from 'react'
import { RUTAS_CORE } from '@/router/rutasApp'
import Boton, { BotonEnlace } from '@/components/ui/Boton'
import Icono from '@/components/ui/Icono'
import { useSesion } from '@/sesion/ContextoSesion'
import estilos from './UsuarioMenu.module.css'

/** Iniciales para el avatar del usuario («Robert G.» → «RG»). */
function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .map((parte) => parte.replace(/[^\p{L}]/gu, '').charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function UsuarioMenu({ claseSeDesvanece }: { claseSeDesvanece: string }) {
  const { estado, cerrarSesion } = useSesion()
  const [abierto, setAbierto] = useState(false)
  const idOpciones = useId()
  const bloque = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    const alPulsarTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAbierto(false)
    }
    const alPulsarFuera = (evento: MouseEvent) => {
      if (evento.target instanceof Node && !bloque.current?.contains(evento.target)) setAbierto(false)
    }
    document.addEventListener('keydown', alPulsarTecla)
    document.addEventListener('mousedown', alPulsarFuera)
    return () => {
      document.removeEventListener('keydown', alPulsarTecla)
      document.removeEventListener('mousedown', alPulsarFuera)
    }
  }, [abierto])

  if (estado.tipo !== 'activa' && estado.tipo !== 'sinConexion') return null
  const { usuario, rol } = estado.sesion

  return (
    <div ref={bloque} className={estilos.usuario}>
      <span className={estilos.avatar} aria-hidden="true" title={usuario.nombre}>
        {iniciales(usuario.nombre)}
      </span>
      <span className={`${estilos.datos} ${claseSeDesvanece}`}>
        <span className={estilos.nombre}>{usuario.nombre}</span>
        <span className={estilos.rol}>{rol.nombre}</span>
      </span>
      <button
        type="button"
        className={`${estilos.opciones} ${claseSeDesvanece}`}
        aria-label="Opciones de la cuenta"
        aria-expanded={abierto}
        aria-controls={idOpciones}
        onClick={() => setAbierto(!abierto)}
      >
        <Icono nombre="ellipsis" tamano="base" className={estilos.iconoVertical} />
      </button>
      <div id={idOpciones} className={`${estilos.lista} ${claseSeDesvanece}`} hidden={!abierto}>
        <BotonEnlace to={RUTAS_CORE.cambiarContrasena} variante="fantasma" compacto onClick={() => setAbierto(false)}>
          Cambiar contraseña
        </BotonEnlace>
        <Boton variante="fantasma" compacto onClick={() => void cerrarSesion()}>
          Cerrar sesión
        </Boton>
      </div>
    </div>
  )
}
