/**
 * Boton: Guía de Estilo Web, sección 5.2.
 *
 * Variantes: primario, secundario, terciario y destructivo. Alto de 40px (`compacto`: 32px, solo en barras
 * de tabla). Etiqueta con verbo en infinitivo + objeto («Aplicar filtros»); nunca «Aceptar», «OK» ni «Enviar».
 * Regla de pantalla: una sola acción primaria visible por pantalla o paso.
 *
 * - Deshabilitado: usa `deshabilitado` y explica el motivo en una ayuda cercana (`ayudaDeshabilitado`).
 *   El botón sigue recibiendo el foco (aria-disabled) para que la ayuda sea descubrible.
 * - Cargando: mantiene el ancho, muestra un indicador, pone `aria-busy` y bloquea el doble envío.
 *
 * `BotonEnlace` tiene el mismo aspecto, pero navega (enlace de react-router).
 */
import { useId, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'
import estilos from './Boton.module.css'

export type VarianteBoton = 'primario' | 'secundario' | 'terciario' | 'destructivo'

interface PropsComunes {
  variante?: VarianteBoton
  /** 32px de alto, solo en barras de tabla. */
  compacto?: boolean
  children: ReactNode
}

export interface BotonProps
  extends PropsComunes,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled' | 'children'> {
  cargando?: boolean
  deshabilitado?: boolean
  /** Motivo por el que el botón está deshabilitado (se muestra junto al botón). */
  ayudaDeshabilitado?: string
  /**
   * Se llama al pulsar el botón deshabilitado (por ejemplo, para mostrar el resumen de errores y llevar el
   * foco al primer campo pendiente). La acción principal (`onClick`) nunca se ejecuta deshabilitado.
   */
  onClickDeshabilitado?: () => void
}

function clases(variante: VarianteBoton, compacto?: boolean, extra?: string) {
  return [estilos.boton, estilos[variante], compacto && estilos.compacto, extra].filter(Boolean).join(' ')
}

export default function Boton({
  variante = 'primario',
  compacto,
  cargando = false,
  deshabilitado = false,
  ayudaDeshabilitado,
  onClickDeshabilitado,
  type = 'button',
  className,
  onClick,
  children,
  ...resto
}: BotonProps) {
  const idAyuda = useId()
  const bloqueado = cargando || deshabilitado

  function alPulsar(evento: MouseEvent<HTMLButtonElement>) {
    if (bloqueado) {
      evento.preventDefault()
      if (deshabilitado && !cargando) onClickDeshabilitado?.()
      return
    }
    onClick?.(evento)
  }

  const boton = (
    <button
      {...resto}
      type={type}
      className={clases(variante, compacto, className)}
      onClick={alPulsar}
      aria-disabled={deshabilitado || undefined}
      aria-busy={cargando || undefined}
      aria-describedby={deshabilitado && ayudaDeshabilitado ? idAyuda : resto['aria-describedby']}
      data-deshabilitado={deshabilitado || undefined}
      data-cargando={cargando || undefined}
    >
      <span className={estilos.contenido}>{children}</span>
      {cargando && <span className={estilos.indicador} aria-hidden="true" />}
    </button>
  )

  if (deshabilitado && ayudaDeshabilitado) {
    return (
      <span className={estilos.conAyuda}>
        {boton}
        <span id={idAyuda} className={estilos.ayuda}>
          {ayudaDeshabilitado}
        </span>
      </span>
    )
  }
  return boton
}

export interface BotonEnlaceProps extends PropsComunes, Omit<LinkProps, 'children'> {}

/** Enlace con aspecto de botón (por ejemplo, «Volver a la bandeja»). */
export function BotonEnlace({ variante = 'terciario', compacto, className, children, ...resto }: BotonEnlaceProps) {
  return (
    <Link {...resto} className={clases(variante, compacto, className)}>
      <span className={estilos.contenido}>{children}</span>
    </Link>
  )
}
