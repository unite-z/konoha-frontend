/**
 * Utilidades compartidas por los controles de formulario (`CampoFormulario`, `AreaTexto` y `Selector`).
 */
import estilos from './CampoFormulario.module.css'

export interface PropsMarcoCampo {
  id: string
  etiqueta: string
  obligatorio?: boolean
  /** Ayuda bajo la etiqueta. */
  ayuda?: string
  /** Mensaje de error que dice qué hacer. */
  error?: string
  /** Si se indica, el campo está bloqueado y se muestra este motivo. */
  bloqueadoMotivo?: string
  /** Oculta la etiqueta visualmente (sigue disponible para lectores de pantalla). */
  etiquetaOculta?: boolean
}

/** Ids de la ayuda, del motivo de bloqueo y del error, para `aria-describedby`. */
export function idsDescripcion({ id, ayuda, error, bloqueadoMotivo }: PropsMarcoCampo): string | undefined {
  const ids = [ayuda && `${id}-ayuda`, bloqueadoMotivo && `${id}-bloqueo`, error && `${id}-error`].filter(Boolean)
  return ids.length > 0 ? ids.join(' ') : undefined
}

/** Clases del control según su estado. */
export function clasesDeControl(error?: string, bloqueado?: boolean, extra?: string): string {
  return [estilos.control, error && estilos.conError, bloqueado && estilos.bloqueado, extra].filter(Boolean).join(' ')
}
