import { useEffect, useRef, type RefObject } from 'react'
import { useLocation } from 'react-router'

/**
 * El foco se mueve con la vista: al cambiar de ruta, enfoca el elemento de la ref (el encabezado o
 * la región principal, con `tabIndex={-1}`). No enfoca en la primera carga.
 */
export function useFocoConLaVista<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null)
  const { pathname } = useLocation()
  const anterior = useRef(pathname)
  useEffect(() => {
    if (anterior.current === pathname) return
    anterior.current = pathname
    ref.current?.focus({ preventScroll: true })
  }, [pathname])
  return ref
}
