/**
 * Cierre animado de los diálogos de `components/ui` (`DialogoFormulario`, `DialogoConfirmacion` y `DialogoDetalle`).
 *
 * `cerrar()` marca `saliendo` (la clase de `AnimacionDialogo.module.css` que anima la salida) y llama a `onCerrar` al
 * terminar la animación del propio diálogo, no la del velo. Sin movimiento («reducir movimiento», o en las pruebas,
 * que no tienen `matchMedia`) llama a `onCerrar` al momento. `saliendo` se reinicia cuando el diálogo vuelve a abrirse.
 */
import { useEffect, useState, type RefObject } from 'react'

/** `false` sin `matchMedia` (pruebas) o con «reducir movimiento». */
function hayMovimiento(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: no-preference)').matches
}

export function useCierreAnimado(referencia: RefObject<HTMLDialogElement | null>, abierto: boolean, onCerrar: () => void) {
  const [saliendo, setSaliendo] = useState(false)
  // Ajuste durante el render: al reabrirse, el diálogo vuelve a entrar desde el principio.
  const [abiertoPrevio, setAbiertoPrevio] = useState(abierto)
  if (abiertoPrevio !== abierto) {
    setAbiertoPrevio(abierto)
    if (abierto) setSaliendo(false)
  }

  useEffect(() => {
    const dialogo = referencia.current
    if (!saliendo || !dialogo) return
    const alTerminar = (evento: Event) => {
      if (evento.target === dialogo && !(evento as AnimationEvent).pseudoElement) onCerrar()
    }
    dialogo.addEventListener('animationend', alTerminar)
    return () => dialogo.removeEventListener('animationend', alTerminar)
  }, [saliendo, onCerrar, referencia])

  function cerrar() {
    if (saliendo) return
    if (hayMovimiento()) setSaliendo(true)
    else onCerrar()
  }

  return { saliendo, cerrar }
}
