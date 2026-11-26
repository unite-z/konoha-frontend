/** `true` por debajo de 768 px de ancho (hoja inferior). Sin `matchMedia` (pruebas) es escritorio. */
import { useSyncExternalStore } from 'react'

const CONSULTA = '(max-width: 767px)'

function suscribir(aviso: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {}
  const lista = window.matchMedia(CONSULTA)
  lista.addEventListener('change', aviso)
  return () => lista.removeEventListener('change', aviso)
}

function instante() {
  return typeof window.matchMedia === 'function' && window.matchMedia(CONSULTA).matches
}

export function useEsMovil(): boolean {
  return useSyncExternalStore(suscribir, instante, () => false)
}
