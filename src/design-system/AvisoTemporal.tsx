/**
 * AvisoTemporal: componente «Toast» del sistema de diseño de Figma (DESIGN.md, 4.1).
 *
 * Confirmación breve de una acción ya hecha: icono del tono, mensaje, detalle opcional y botón de cierre.
 * Se oculta a los 6 segundos. Los errores que la persona tiene que corregir van en `AvisoEnLinea`; el tono
 * `error` es solo para avisar de que una acción en segundo plano ha fallado.
 */
import { useEffect } from 'react'
import Icono from './Icono'
import estilos from './AvisoTemporal.module.css'

/** Duración visible del aviso. */
const DURACION_MS = 6000

export interface AvisoTemporalProps {
  /** Mensaje; sin mensaje no se muestra nada. */
  mensaje: string | null
  /** Segunda línea, en texto secundario. */
  detalle?: string
  /** `info`: un aviso que no es de una acción propia («J-015 ya estaba marcado», Figma 353-2396). */
  tono?: 'exito' | 'error' | 'info'
  onCerrar: () => void
}

export default function AvisoTemporal({ mensaje, detalle, tono = 'exito', onCerrar }: AvisoTemporalProps) {
  useEffect(() => {
    if (!mensaje) return
    const temporizador = window.setTimeout(onCerrar, DURACION_MS)
    return () => window.clearTimeout(temporizador)
  }, [mensaje, onCerrar])

  return (
    <div className={estilos.region} role="status" aria-live="polite">
      {mensaje && (
        <div className={estilos.aviso}>
          <span className={`${estilos.icono} ${estilos[tono]}`}>
            <Icono nombre={tono === 'exito' ? 'verificacion' : tono === 'info' ? 'info' : 'aspa'} tamano="base" />
          </span>
          <div className={estilos.cuerpo}>
            <span className={estilos.mensaje}>{mensaje}</span>
            {detalle && <span className={estilos.detalle}>{detalle}</span>}
          </div>
          <button type="button" className={estilos.cerrar} aria-label="Cerrar aviso" onClick={onCerrar}>
            <Icono nombre="aspa" tamano="base" />
          </button>
        </div>
      )}
    </div>
  )
}
