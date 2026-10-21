/**
 * Controles de formulario: Guía de Estilo Web, secciones 5.3 y 5.4.
 *
 * - `CampoFormulario`: campo de una línea (`<input>`).
 * - `AreaTexto`: campo de varias líneas (`<textarea>`).
 * - `MarcoCampo`: etiqueta, ayuda y error comunes (también lo usa `Selector`).
 * - `LeyendaObligatorio`: leyenda «* Campo obligatorio» encima del formulario.
 * - `ResumenErrores`: resumen encima del formulario con enlaces a cada campo con error.
 *
 * Reglas: etiqueta siempre visible encima (el placeholder nunca la sustituye), obligatorios con asterisco,
 * error debajo del campo que dice qué hacer y enlazado con `aria-describedby`, bloqueado con explicación.
 * La validación de formato se hace al salir del campo (blur) y la de obligatoriedad al enviar: la decide la
 * página o el componente que usa el campo.
 */
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import Icono from './Icono'
import { clasesDeControl, idsDescripcion, type PropsMarcoCampo } from './campoFormularioUtil'
import estilos from './CampoFormulario.module.css'

export type { PropsMarcoCampo } from './campoFormularioUtil'

/** Etiqueta, ayuda y error alrededor de un control. */
export function MarcoCampo({
  id,
  etiqueta,
  obligatorio,
  ayuda,
  error,
  bloqueadoMotivo,
  etiquetaOculta,
  children,
}: PropsMarcoCampo & { children: ReactNode }) {
  return (
    <div className={estilos.campo}>
      <label htmlFor={id} className={etiquetaOculta ? 'sr-only' : estilos.etiqueta}>
        {etiqueta}
        {obligatorio && (
          <span className={estilos.asterisco} aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {ayuda && (
        <p id={`${id}-ayuda`} className={estilos.ayuda}>
          {ayuda}
        </p>
      )}
      {children}
      {bloqueadoMotivo && (
        <p id={`${id}-bloqueo`} className={estilos.ayuda}>
          {bloqueadoMotivo}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className={estilos.error}>
          <Icono nombre="aspa" tamano="sm" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}

export type CampoFormularioProps = PropsMarcoCampo & Omit<InputHTMLAttributes<HTMLInputElement>, 'id'>

/** Campo de una línea. */
export default function CampoFormulario(props: CampoFormularioProps) {
  const { id, etiqueta, obligatorio, ayuda, error, bloqueadoMotivo, etiquetaOculta, className, ...resto } = props
  const marco = { id, etiqueta, obligatorio, ayuda, error, bloqueadoMotivo, etiquetaOculta }
  return (
    <MarcoCampo {...marco}>
      <input
        {...resto}
        id={id}
        className={clasesDeControl(error, Boolean(bloqueadoMotivo), className)}
        aria-invalid={error ? true : undefined}
        aria-required={obligatorio || undefined}
        aria-describedby={idsDescripcion(marco)}
        readOnly={Boolean(bloqueadoMotivo) || resto.readOnly}
      />
    </MarcoCampo>
  )
}

export type AreaTextoProps = PropsMarcoCampo & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'>

/** Campo de varias líneas. */
export function AreaTexto(props: AreaTextoProps) {
  const { id, etiqueta, obligatorio, ayuda, error, bloqueadoMotivo, etiquetaOculta, className, ...resto } = props
  const marco = { id, etiqueta, obligatorio, ayuda, error, bloqueadoMotivo, etiquetaOculta }
  return (
    <MarcoCampo {...marco}>
      <textarea
        rows={3}
        {...resto}
        id={id}
        className={clasesDeControl(error, Boolean(bloqueadoMotivo), `${estilos.area} ${className ?? ''}`)}
        aria-invalid={error ? true : undefined}
        aria-required={obligatorio || undefined}
        aria-describedby={idsDescripcion(marco)}
        readOnly={Boolean(bloqueadoMotivo) || resto.readOnly}
      />
    </MarcoCampo>
  )
}

/** Leyenda de los campos obligatorios, encima del formulario. */
export function LeyendaObligatorio() {
  return <p className={estilos.leyenda}>* Campo obligatorio</p>
}

export interface ErrorResumen {
  /** Id del campo al que lleva el enlace. */
  idCampo: string
  mensaje: string
}

/**
 * Resumen de errores encima del formulario. Cada error es un enlace que lleva el foco a su campo.
 * La página pasa el foco al primer campo con error al enviar.
 */
export function ResumenErrores({ titulo, errores }: { titulo: string; errores: ErrorResumen[] }) {
  if (errores.length === 0) return null
  return (
    <div className={estilos.resumen} role="alert">
      <p className={estilos.resumenTitulo}>
        <Icono nombre="aspa" tamano="sm" />
        <span>{titulo}</span>
      </p>
      <ul>
        {errores.map((e) => (
          <li key={e.idCampo + e.mensaje}>
            <a
              href={`#${e.idCampo}`}
              onClick={(evento) => {
                evento.preventDefault()
                document.getElementById(e.idCampo)?.focus()
              }}
            >
              {e.mensaje}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
