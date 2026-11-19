/**
 * EstadoCarga: Guía de Estilo Web, sección 5.12.
 *
 * Esqueleto con la forma del contenido, sin animación llamativa. Solo debe aparecer si la carga dura más de
 * 300 ms: con `useConsulta` la página usa `cargaVisible`; en otros casos, `retrasar` aplica el umbral aquí.
 *
 * Formas: `tarjetas` (fila de tarjetas), `tabla` (filas) y `pagina` (tarjetas y tabla).
 */
import { useEffect, useState } from 'react'
import estilos from './EstadosContenido.module.css'

export interface EstadoCargaProps {
  forma?: 'tarjetas' | 'tabla' | 'pagina'
  /** Número de filas del esqueleto de tabla. */
  filas?: number
  /** Texto visible que explica la espera (por ejemplo, «Analizando el informe del proveedor…»). */
  texto?: string
  /** Aplica aquí el umbral de 300 ms antes de mostrarse. */
  retrasar?: boolean
}

/** Umbral para mostrar el estado de carga (Guía Web 5.12). */
const UMBRAL_CARGA_MS = 300

/** Texto accesible predeterminado del estado de carga. */
const TEXTO_CARGANDO = 'Cargando…'

export default function EstadoCarga({ forma = 'pagina', filas = 5, texto, retrasar = false }: EstadoCargaProps) {
  const [visible, setVisible] = useState(!retrasar)

  useEffect(() => {
    if (!retrasar) return
    const temporizador = window.setTimeout(() => setVisible(true), UMBRAL_CARGA_MS)
    return () => window.clearTimeout(temporizador)
  }, [retrasar])

  if (!visible) return null

  const tarjetas = (
    <div className={estilos.esqueletoTarjetas}>
      {[0, 1, 2].map((i) => (
        <div key={i} className={estilos.esqueletoTarjeta}>
          <div className={`${estilos.bloque} ${estilos.lineaCorta}`} />
          <div className={`${estilos.bloque} ${estilos.lineaValor}`} />
        </div>
      ))}
    </div>
  )

  const tabla = (
    <div className={estilos.esqueletoTabla}>
      <div className={estilos.esqueletoCabecera} />
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className={estilos.esqueletoFila}>
          <div className={`${estilos.bloque} ${estilos.lineaLarga}`} />
        </div>
      ))}
    </div>
  )

  return (
    <div className={estilos.carga} role="status" aria-busy="true">
      <span className={texto ? estilos.textoCarga : 'sr-only'}>{texto ?? TEXTO_CARGANDO}</span>
      {(forma === 'tarjetas' || forma === 'pagina') && tarjetas}
      {(forma === 'tabla' || forma === 'pagina') && tabla}
    </div>
  )
}
