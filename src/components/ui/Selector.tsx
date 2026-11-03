/**
 * Selector: «Desplegable · campo» del sistema de diseño de Figma (DESIGN.md, 4.1). `<select>` nativo (teclado
 * y lista del sistema) con el icono `chevron-down` de Figma. En los filtros opcionales incluye la opción «Todos»
 * (valor vacío); sin valor elegido, el texto va en gris como un marcador. Con `compacto`, 32px.
 */
import type { SelectHTMLAttributes } from 'react'
import { MarcoCampo } from './CampoFormulario'
import Icono from './Icono'
import { clasesDeControl, idsDescripcion, type PropsMarcoCampo } from './campoFormularioUtil'
import estilos from './CampoFormulario.module.css'

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
    compacto,
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
      <span className={estilos.desplegable}>
        <select
          {...resto}
          id={id}
          value={valor}
          onChange={(evento) => onCambiar(evento.target.value)}
          className={clasesDeControl(error, Boolean(bloqueadoMotivo), `${estilos.select} ${className ?? ''}`, compacto)}
          data-vacio={valor === '' || undefined}
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
        <Icono nombre="chevron-down" tamano="base" className={estilos.flecha} />
      </span>
    </MarcoCampo>
  )
}
