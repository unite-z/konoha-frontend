/**
 * Boton: componente «Botón» del sistema de diseño de Figma (DESIGN.md, sección 4.1).
 *
 * Tipos: primario, secundario, fantasma y destructivo. Alto de 36px (`compacto`: 32px, solo en barras de
 * tabla). `terciario` es el nombre antiguo de `fantasma` y se mantiene mientras migran las pantallas.
 * Etiqueta con verbo en infinitivo + objeto («Aplicar filtros»); nunca «Aceptar», «OK» ni «Enviar».
 * Regla de pantalla: una sola acción primaria visible por pantalla o paso.
 *
 * - Icono opcional (`icono`) delante del texto, a 16px como en Figma.
 * - Deshabilitado: usa `deshabilitado` y explica el motivo en una ayuda cercana (`ayudaDeshabilitado`).
 *   El botón sigue recibiendo el foco (aria-disabled) para que la ayuda sea descubrible.
 * - Cargando: mantiene el ancho, muestra un indicador, pone `aria-busy` y bloquea el doble envío.
 *
 * `BotonEnlace` tiene el mismo aspecto, pero navega (enlace de react-router).
 */
import { useId, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'
import Icono, { type NombreIcono } from './Icono'
import estilos from './Boton.module.css'

/** `terciario` es el nombre antiguo de `fantasma`: no lo uses en código nuevo. */
export type VarianteBoton = 'primario' | 'secundario' | 'fantasma' | 'destructivo' | 'terciario'

interface PropsComunes {
  variante?: VarianteBoton
  /** 32px de alto, solo en barras de tabla. */
  compacto?: boolean
  /** Icono delante del texto (decorativo: el texto ya da el nombre accesible). */
  icono?: NombreIcono
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
  const tipo = variante === 'terciario' ? 'fantasma' : variante
  return [estilos.boton, estilos[tipo], compacto && estilos.compacto, extra].filter(Boolean).join(' ')
}

function Contenido({ icono, children }: { icono?: NombreIcono; children: ReactNode }) {
  return (
    <span className={estilos.contenido}>
      {icono && <Icono nombre={icono} tamano="base" />}
      {children}
    </span>
  )
}

export default function Boton({
  variante = 'primario',
  compacto,
  icono,
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
      <Contenido icono={icono}>{children}</Contenido>
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
export function BotonEnlace({ variante = 'fantasma', compacto, icono, className, children, ...resto }: BotonEnlaceProps) {
  return (
    <Link {...resto} className={clases(variante, compacto, className)}>
      <Contenido icono={icono}>{children}</Contenido>
    </Link>
  )
}
