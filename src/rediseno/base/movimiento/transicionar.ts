/** Cambio de estado animado con View Transitions. Sin soporte o con «reducir movimiento», se aplica directamente. */
export function reducirMovimiento(): boolean {
  return typeof window !== "undefined" &&
    typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

export function transicionar(cambio: () => void): void {
  if (
    typeof document === "undefined" ||
    typeof document.startViewTransition !== "function" ||
    reducirMovimiento()
  ) {
    cambio();
    return;
  }
  document.startViewTransition(cambio);
}
