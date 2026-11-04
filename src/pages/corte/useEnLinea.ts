/**
 * `true` mientras el navegador tiene conexión (`navigator.onLine` y los eventos `online` y `offline`). Lo usa
 * «Ruta de hoy» para guardar las marcas sin conexión y enviarlas al volver (AV-271).
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
