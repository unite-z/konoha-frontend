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
  /**
   * Id de un mensaje de error que se pinta fuera del campo (por ejemplo, bajo una tabla de campos, como en Figma):
   * el campo se marca en error y lo enlaza, pero no repite el mensaje.
   */
  idErrorExterno?: string
  /** Si se indica, el campo está bloqueado y se muestra este motivo. */
  bloqueadoMotivo?: string
  /** Oculta la etiqueta visualmente (sigue disponible para lectores de pantalla). */
  etiquetaOculta?: boolean
  /** «Campo · compacto» de Figma: 32px, para filtros en barra y celdas de tabla. */
  compacto?: boolean
}

/** Ids de la ayuda, del motivo de bloqueo y del error, para `aria-describedby`. */
export function idsDescripcion({ id, ayuda, error, bloqueadoMotivo, idErrorExterno }: PropsMarcoCampo): string | undefined {
  const ids = [ayuda && `${id}-ayuda`, bloqueadoMotivo && `${id}-bloqueo`, error && (idErrorExterno ?? `${id}-error`)].filter(Boolean)
  return ids.length > 0 ? ids.join(' ') : undefined
}

/** Clases del control según su estado. */
export function clasesDeControl(error?: string, bloqueado?: boolean, extra?: string, compacto?: boolean): string {
  return [estilos.control, compacto && estilos.compacto, error && estilos.conError, bloqueado && estilos.bloqueado, extra]
    .filter(Boolean)
    .join(' ')
}

/** Tipo de contenido de un campo de una línea: filtra lo que se escribe o se pega. */
export type FormatoCampo = 'entero' | 'decimal'

export interface OpcionesFormato {
  /** Decimales como máximo (solo `decimal`). */
  decimales?: number
  /** Admite un signo menos al principio (coordenadas). */
  negativo?: boolean
}

/**
 * Deja solo lo que admite el formato: `entero`, dígitos; `decimal`, dígitos, espacios (separador de miles) y un
 * único separador decimal, coma o punto, con `decimales` como máximo. El valor se valida igualmente al guardar.
 */
export function filtrarNumero(valor: string, formato: FormatoCampo, { decimales, negativo = false }: OpcionesFormato = {}): string {
  const signo = negativo && valor.trimStart().startsWith('-') ? '-' : ''
  if (formato === 'entero') return signo + valor.replace(/\D/g, '')
  let separador = false
  let enDecimales = 0
  let limpio = ''
  for (const caracter of valor) {
    if (/\d/.test(caracter)) {
      if (separador && decimales !== undefined && enDecimales >= decimales) continue
      if (separador) enDecimales += 1
      limpio += caracter
    } else if ((caracter === ',' || caracter === '.') && !separador && decimales !== 0) {
      separador = true
      limpio += caracter
    } else if (caracter === ' ' && !separador) {
      limpio += caracter
    }
  }
  return signo + limpio
}
