import { flushSync } from 'react-dom'

/** ¿Pide el usuario «reducir movimiento»? */
export function reducirMovimiento(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

/**
 * Cambio de estado dentro de una vista animado con View Transitions. Sin soporte o con «reducir
 * movimiento», el cambio se aplica directamente. Dentro de la transición se usa `flushSync` para
 * que React pinte el estado nuevo antes de la captura; si no, la vista «nueva» sería la vieja.
 */
export function transicionar(cambio: () => void): void {
  if (typeof document === 'undefined' || typeof document.startViewTransition !== 'function' || reducirMovimiento()) {
    cambio()
    return
  }
  const transicion = document.startViewTransition(() => flushSync(cambio))
  // Si el navegador salta la transición (p. ej. dos elementos con el mismo nombre), el cambio se
  // aplica igual; se evita el rechazo sin capturar de `ready`.
  transicion.ready.catch(() => undefined)
}
