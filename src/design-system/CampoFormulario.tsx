/**
 * Controles de formulario: componente «Campo» del sistema de diseño de Figma (DESIGN.md, sección 4.1).
 *
 * - `CampoFormulario`: campo de una línea (`<input>`). Con `type="date"` o `type="time"` es «Campo · fecha»
 *   o «Campo · hora» (selector nativo del navegador). Con `compacto`, «Campo · compacto».
 * - `AreaTexto`: campo de varias líneas (`<textarea>`).
 * - `MarcoCampo`: etiqueta, ayuda y error comunes (también lo usa `Selector`).
 * - `LeyendaObligatorio`: leyenda «* Campo obligatorio» encima del formulario.
 * - `ResumenErrores`: resumen encima del formulario con enlaces a cada campo con error.
 *
 * Reglas: etiqueta siempre visible encima (el placeholder nunca la sustituye), ayuda debajo del control,
 * obligatorios con asterisco, error debajo del campo que dice qué hacer y enlazado con `aria-describedby`, bloqueado con explicación.
 * La validación de formato se hace al salir del campo (blur) y la de obligatoriedad al enviar: la decide la
 * página o el componente que usa el campo. Con `formato` («entero» o «decimal»), además, el campo no deja escribir
 * ni pegar lo que no sea un número (`filtrarNumero`) y abre el teclado numérico en el móvil.
 */
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import Icono from './Icono'
import { clasesDeControl, filtrarNumero, idsDescripcion, type FormatoCampo, type PropsMarcoCampo } from './campoFormularioUtil'
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
  idErrorExterno,
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
      {children}
      {ayuda && (
        <p id={`${id}-ayuda`} className={estilos.ayuda}>
          {ayuda}
        </p>
      )}
      {bloqueadoMotivo && (
        <p id={`${id}-bloqueo`} className={estilos.ayuda}>
          {bloqueadoMotivo}
        </p>
      )}
      {error && !idErrorExterno && (
        <p id={`${id}-error`} className={estilos.error}>
          <Icono nombre="aspa" tamano="sm" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}

export type CampoFormularioProps = PropsMarcoCampo &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
    /** Solo números: `entero` (días, cantidades, RUC) o `decimal` (importes, superficies). */
    formato?: FormatoCampo
    /** Decimales como máximo con `formato="decimal"`. */
    decimales?: number
    /** Admite un signo menos al principio. */
    negativo?: boolean
  }

const TECLADO: Record<FormatoCampo, 'numeric' | 'decimal'> = { entero: 'numeric', decimal: 'decimal' }

/** Campo de una línea. */
export default function CampoFormulario(props: CampoFormularioProps) {
  const { id, etiqueta, obligatorio, ayuda, error, bloqueadoMotivo, etiquetaOculta, idErrorExterno, compacto, className, formato, decimales, negativo, onChange, ...resto } = props
  const marco = { id, etiqueta, obligatorio, ayuda, error, bloqueadoMotivo, etiquetaOculta, idErrorExterno }

  // Quita lo que no admite el formato antes de avisar a la página y deja el cursor donde estaba.
  const alCambiar: typeof onChange = formato
    ? (evento) => {
        const control = evento.target
        const limpio = filtrarNumero(control.value, formato, { decimales, negativo })
        if (limpio !== control.value) {
          const cursor = Math.max(0, (control.selectionStart ?? limpio.length) - (control.value.length - limpio.length))
          control.value = limpio
          control.setSelectionRange?.(cursor, cursor)
        }
        onChange?.(evento)
      }
    : onChange

  return (
    <MarcoCampo {...marco}>
      <input
        inputMode={formato ? TECLADO[formato] : undefined}
        {...resto}
        onChange={alCambiar}
        // Hora vacía: sin el marcador gris del navegador, que en Safari parece una hora elegida.
        data-vacio={resto.type === 'time' && !resto.value ? true : undefined}
        id={id}
        className={clasesDeControl(error, Boolean(bloqueadoMotivo), className, compacto)}
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
  const { id, etiqueta, obligatorio, ayuda, error, bloqueadoMotivo, etiquetaOculta, idErrorExterno, compacto, className, ...resto } = props
  const marco = { id, etiqueta, obligatorio, ayuda, error, bloqueadoMotivo, etiquetaOculta, idErrorExterno }
  return (
    <MarcoCampo {...marco}>
      <textarea
        rows={3}
        {...resto}
        id={id}
        className={clasesDeControl(error, Boolean(bloqueadoMotivo), `${estilos.area} ${className ?? ''}`, compacto)}
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
