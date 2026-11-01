/**
 * `true` en pantallas de móvil (punto de corte del proyecto: hasta 767 px de ancho). Se actualiza al girar o
 * redimensionar la ventana.
 */
import { useSyncExternalStore } from 'react'

const CONSULTA_MOVIL = '(max-width: 767px)'

function suscribir(aviso: () => void): () => void {
  const consulta = window.matchMedia(CONSULTA_MOVIL)
  consulta.addEventListener('change', aviso)
  return () => consulta.removeEventListener('change', aviso)
}

export function useEsMovil(): boolean {
  return useSyncExternalStore(
    suscribir,
    () => window.matchMedia(CONSULTA_MOVIL).matches,
    () => false,
  )
}
