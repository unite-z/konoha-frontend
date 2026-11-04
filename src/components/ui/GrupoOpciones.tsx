/**
 * GrupoOpciones: «Radio compacto» y «Opción» del sistema de diseño de Figma (DESIGN.md, 4.1).
 *
 * Elegir una sola opción entre pocas, todas visibles. Radios nativos agrupados en `fieldset` con `legend`
 * (las flechas mueven la selección, como en cualquier grupo de radios). Cada opción es una fila con borde;
 * la elegida se marca con borde y fondo de acento.
 *
 * - `compacta` (Radio compacto): solo el texto.
 * - `tarjeta` (Opción): texto y descripción. Se usa sola si alguna opción lleva `descripcion`.
 * - `segmentado`: las opciones repartidas en una fila sobre fondo sutil y la elegida en blanco, como el control
 *   segmentado de `Pestanas` («Severidad» y «Impacto» de «Clasificar», Figma 388-7305). Sigue siendo un grupo de radios.
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
  /**
   * Base de los ids: cada radio es `${idBase}-${valor}` y el error `${idBase}-error`, para enlazarlos desde un
   * resumen de errores. Por defecto, una propia.
   */
  idBase?: string
  /** Deshabilita todo el grupo (por ejemplo, mientras se envía el formulario). */
  deshabilitado?: boolean
  /** Opciones en una fila (decisiones cortas como «Aceptar / Corregir / Descartar»); en móvil se apilan. */
  horizontal?: boolean
  /** Ids de textos externos que describen el grupo (ayuda o error que la pantalla pinta fuera). */
  descritoPor?: string
  /** Control segmentado: 2 o 3 opciones cortas repartidas en una fila (Figma 388-7305). */
  segmentado?: boolean
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
  idBase,
  deshabilitado = false,
  horizontal = false,
  descritoPor,
  segmentado = false,
}: GrupoOpcionesProps<V>) {
  const idPropio = useId()
  const base = idBase ?? idPropio
  const nombreGrupo = nombre ?? base
  const idError = `${base}-error`
  const tarjeta = opciones.some((opcion) => opcion.descripcion)

  return (
    <fieldset
      className={estilos.grupo}
      disabled={deshabilitado}
      aria-required={obligatorio || undefined}
      aria-invalid={error ? true : undefined}
      aria-describedby={[error && idError, descritoPor].filter(Boolean).join(' ') || undefined}
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
      <div className={[estilos.opciones, tarjeta && estilos.tarjetas, horizontal && estilos.horizontal, segmentado && estilos.segmentado].filter(Boolean).join(' ')}>
        {opciones.map((opcion) => {
          const id = `${base}-${opcion.valor}`
          const elegida = opcion.valor === valor
          return (
            <label
              key={opcion.valor}
              htmlFor={id}
              className={[
                estilos.opcion,
                elegida && estilos.elegida,
                (opcion.deshabilitada || deshabilitado) && estilos.deshabilitada,
              ]
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
