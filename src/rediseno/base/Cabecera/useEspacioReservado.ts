import { type RefObject, useLayoutEffect } from 'react'

/** Borde inferior de la cabecera fija: el contenido y el panel lateral empiezan por debajo. */
export const VARIABLE_CABECERA = '--rediseno-alto-cabecera'
/** Lo que ocupa la barra inferior del móvil desde el borde de abajo (0 cuando no se pinta). */
export const VARIABLE_BARRA = '--rediseno-alto-barra'

export function bordeInferior(rect: DOMRect): number {
  return rect.height === 0 ? 0 : rect.bottom
}

export function desdeAbajo(rect: DOMRect): number {
  return rect.height === 0 ? 0 : Math.max(0, window.innerHeight - rect.top)
}

/**
 * Publica en `:root` cuánto espacio tapa una pieza fija (cabecera o barra inferior), medido en el navegador, para que
 * el contenido y los paneles no queden debajo: la altura cambia con las pestañas, el ancho y el tamaño de letra.
 * `presente` es `false` cuando la pieza no se pinta: entonces no tapa nada.
 */
export function useEspacioReservado(
  referencia: RefObject<HTMLElement | null>,
  variable: string,
  medir: (rect: DOMRect) => number,
  presente = true,
) {
  useLayoutEffect(() => {
    const elemento = referencia.current
    const raiz = document.documentElement.style
    if (!presente || !elemento) {
      raiz.setProperty(variable, '0px')
      return () => raiz.removeProperty(variable)
    }
    const actualizar = () => raiz.setProperty(variable, `${Math.ceil(medir(elemento.getBoundingClientRect()))}px`)
    actualizar()
    const observador = typeof ResizeObserver === 'function' ? new ResizeObserver(actualizar) : null
    observador?.observe(elemento)
    window.addEventListener('resize', actualizar)
    return () => {
      observador?.disconnect()
      window.removeEventListener('resize', actualizar)
      raiz.removeProperty(variable)
    }
  }, [referencia, variable, medir, presente])
}
