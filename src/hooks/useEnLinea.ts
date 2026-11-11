/**
 * `true` mientras el navegador tiene conexión (`navigator.onLine` y los eventos `online` y `offline`). Lo usan la
 * cola sin conexión (RF-T-012), «Ruta de hoy» (MOD-03), el reporte de incidencias (MOD-03) y el parte (MOD-04).
 */
import { useSyncExternalStore } from 'react'

function suscribir(aviso: () => void): () => void {
  window.addEventListener('online', aviso)
  window.addEventListener('offline', aviso)
  return () => {
    window.removeEventListener('online', aviso)
    window.removeEventListener('offline', aviso)
  }
}

export function useEnLinea(): boolean {
  return useSyncExternalStore(
    suscribir,
    () => navigator.onLine,
    () => true,
  )
}
