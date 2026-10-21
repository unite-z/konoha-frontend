/**
 * AvisoTemporal: confirmación breve de una acción (Guía de Estilo Web, sección 5.10).
 * Se oculta a los 6 segundos. No se usa para errores (los errores van en `AvisoEnLinea`).
 */
import { useEffect } from 'react'
import Icono from './Icono'
import estilos from './AvisoTemporal.module.css'

/** Duración visible del aviso (Guía Web 5.10). */
const DURACION_MS = 6000

export interface AvisoTemporalProps {
  /** Mensaje; sin mensaje no se muestra nada. */
  mensaje: string | null
  onCerrar: () => void
}

export default function AvisoTemporal({ mensaje, onCerrar }: AvisoTemporalProps) {
  useEffect(() => {
    if (!mensaje) return
    const temporizador = window.setTimeout(onCerrar, DURACION_MS)
    return () => window.clearTimeout(temporizador)
  }, [mensaje, onCerrar])

  return (
    <div className={estilos.region} role="status" aria-live="polite">
      {mensaje && (
        <div className={estilos.aviso}>
          <span className={estilos.icono}>
            <Icono nombre="verificacion" />
          </span>
          <span>{mensaje}</span>
        </div>
      )}
    </div>
  )
}
