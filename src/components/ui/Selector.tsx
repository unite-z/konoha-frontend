/**
 * Selector: `<select>` nativo con el aspecto de `CampoFormulario` (Guía de Estilo Web, sección 5.3).
 * En los filtros opcionales incluye la opción «Todos» (valor vacío).
 */
import type { SelectHTMLAttributes } from 'react'
import { MarcoCampo } from './CampoFormulario'
import { clasesDeControl, idsDescripcion, type PropsMarcoCampo } from './campoFormularioUtil'

export interface OpcionSelector {
  valor: string
  texto: string
}

export interface SelectorProps
  extends PropsMarcoCampo,
    Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'value' | 'onChange'> {
  valor: string
  opciones: OpcionSelector[]
  onCambiar: (valor: string) => void
  /** Texto de la opción con valor vacío (por ejemplo, «Todos»). Sin él, no hay opción vacía. */
  opcionTodos?: string
}

/** Texto de la opción vacía de los filtros opcionales. */
export const OPCION_TODOS = 'Todos'

export default function Selector(props: SelectorProps) {
  const {
    id,
    etiqueta,
    obligatorio,
    ayuda,
    error,
    bloqueadoMotivo,
    etiquetaOculta,
    valor,
    opciones,
    onCambiar,
    opcionTodos,
    className,
    ...resto
  } = props
  const marco = { id, etiqueta, obligatorio, ayuda, error, bloqueadoMotivo, etiquetaOculta }
  return (
    <MarcoCampo {...marco}>
      <select
        {...resto}
        id={id}
        value={valor}
        onChange={(evento) => onCambiar(evento.target.value)}
        className={clasesDeControl(error, Boolean(bloqueadoMotivo), className)}
        aria-invalid={error ? true : undefined}
        aria-required={obligatorio || undefined}
        aria-describedby={idsDescripcion(marco)}
        disabled={Boolean(bloqueadoMotivo) || resto.disabled}
      >
        {opcionTodos !== undefined && <option value="">{opcionTodos}</option>}
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.texto}
          </option>
        ))}
      </select>
    </MarcoCampo>
  )
}
