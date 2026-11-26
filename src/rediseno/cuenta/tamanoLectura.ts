/**
 * Preferencia «Lectura» (P-16): tamaño del texto, guardado solo en este navegador. Se aplica como atributo de
 * `<html>` (`data-lectura-tamano`), que `tamanoLectura.css` traduce a escala. Sin almacenamiento, vale hasta recargar.
 */
import './tamanoLectura.css'

export type TamanoLectura = 'normal' | 'grande' | 'muy-grande'

export const TAMANOS_LECTURA: readonly TamanoLectura[] = ['normal', 'grande', 'muy-grande']
export const CLAVE_LECTURA = 'av:lectura'
const ATRIBUTO = 'lecturaTamano'

export function leerTamanoLectura(): TamanoLectura {
  try {
    const valor = window.localStorage.getItem(CLAVE_LECTURA)
    return TAMANOS_LECTURA.find((t) => t === valor) ?? 'normal'
  } catch {
    return 'normal'
  }
}

function aplicar(tamano: TamanoLectura) {
  const raiz = document.documentElement
  if (tamano === 'normal') delete raiz.dataset[ATRIBUTO]
  else raiz.dataset[ATRIBUTO] = tamano
}

export function guardarTamanoLectura(tamano: TamanoLectura) {
  aplicar(tamano)
  try {
    window.localStorage.setItem(CLAVE_LECTURA, tamano)
  } catch {
    // Sin almacenamiento: se aplica igual, solo que no se recuerda.
  }
}

/** Al arrancar: aplica lo guardado antes de pintar. */
export function instalarLectura() {
  if (typeof document === 'undefined') return // pruebas en entorno node
  aplicar(leerTamanoLectura())
}
