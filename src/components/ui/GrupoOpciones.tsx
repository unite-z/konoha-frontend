/**
 * GrupoOpciones: «Radio compacto» y «Opción» del sistema de diseño de Figma (DESIGN.md, 4.1).
 *
 * Elegir una sola opción entre pocas, todas visibles. Radios nativos agrupados en `fieldset` con `legend`
 * (las flechas mueven la selección, como en cualquier grupo de radios). Cada opción es una fila con borde;
 * la elegida se marca con borde y fondo de acento.
 *
 * - `compacta` (Radio compacto): solo el texto.
 * - `tarjeta` (Opción): texto y descripción. Se usa sola si alguna opción lleva `descripcion`.
 *
 * Para más de 5 opciones, usa `Selector`.
 */
import { useId } from 'react'
import estilos from './GrupoOpciones.module.css'

export interface OpcionGrupo<V extends string> {
  valor: V
  texto: string
  descripcion?: string
  deshabilitada?: boolean
}

export interface GrupoOpcionesProps<V extends string> {
  /** Pregunta del grupo (legend). */
  etiqueta: string
  opciones: OpcionGrupo<V>[]
  valor: V | null
  onCambiar: (valor: V) => void
  /** Nombre del grupo de radios; por defecto, uno propio. */
  nombre?: string
  obligatorio?: boolean
  error?: string
  /** Oculta el legend visualmente (sigue disponible para lectores de pantalla). */
  etiquetaOculta?: boolean
}

export default function GrupoOpciones<V extends string>({
  etiqueta,
  opciones,
  valor,
  onCambiar,
  nombre,
  obligatorio = false,
  error,
  etiquetaOculta = false,
}: GrupoOpcionesProps<V>) {
  const base = useId()
  const nombreGrupo = nombre ?? base
  const idError = `${base}-error`
  const tarjeta = opciones.some((opcion) => opcion.descripcion)

  return (
    <fieldset
      className={estilos.grupo}
      aria-required={obligatorio || undefined}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? idError : undefined}
    >
      <legend className={etiquetaOculta ? 'sr-only' : estilos.etiqueta}>
        {etiqueta}
        {obligatorio && (
          <span className={estilos.asterisco} aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </legend>
      <div className={`${estilos.opciones} ${tarjeta ? estilos.tarjetas : ''}`}>
        {opciones.map((opcion) => {
          const id = `${base}-${opcion.valor}`
          const elegida = opcion.valor === valor
          return (
            <label
              key={opcion.valor}
              htmlFor={id}
              className={[estilos.opcion, elegida && estilos.elegida, opcion.deshabilitada && estilos.deshabilitada]
                .filter(Boolean)
                .join(' ')}
            >
              <input
                id={id}
                type="radio"
                name={nombreGrupo}
                value={opcion.valor}
                className={estilos.control}
                checked={elegida}
                disabled={opcion.deshabilitada}
                onChange={() => onCambiar(opcion.valor)}
                // El nombre es solo el texto; la descripción se anuncia aparte (si no, se leería dos veces).
                aria-labelledby={`${id}-texto`}
                aria-describedby={opcion.descripcion ? `${id}-descripcion` : undefined}
              />
              <span className={estilos.textos}>
                <span id={`${id}-texto`} className={estilos.texto}>
                  {opcion.texto}
                </span>
                {opcion.descripcion && (
                  <span id={`${id}-descripcion`} className={estilos.descripcion}>
                    {opcion.descripcion}
                  </span>
                )}
              </span>
            </label>
          )
        })}
      </div>
      {error && (
        <p id={idError} className={estilos.error}>
          {error}
        </p>
      )}
    </fieldset>
  )
}
