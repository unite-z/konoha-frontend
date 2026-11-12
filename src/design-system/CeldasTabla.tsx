/**
 * Celdas de tabla: tipos de texto de «Tabla · celda» del sistema de diseño de Figma (DESIGN.md, 4.2).
 *
 * Se usan en el `render` de una columna de `TablaDatos`. Los otros tipos de Figma ya son componentes:
 * Estado → `Estado`; Acción → `AccionFila` (AV-390); Avance → `BarraAvance`.
 */
import type { ReactNode } from 'react'
import { SIN_VALOR } from '@/utils/formato'
import estilos from './CeldasTabla.module.css'

export interface CeldaTextoProps {
  texto: ReactNode
  /** Texto, Texto secundario, Texto deshabilitado y Texto aviso de Figma. */
  tono?: 'principal' | 'secundario' | 'deshabilitado' | 'aviso'
  /** Texto destacado (peso medio). */
  destacado?: boolean
}

/** Texto de una celda. Sin valor, muestra `SIN_VALOR` en tono deshabilitado. */
export function CeldaTexto({ texto, tono = 'principal', destacado = false }: CeldaTextoProps) {
  const vacio = texto === null || texto === undefined || texto === ''
  const clases = [estilos[vacio ? 'deshabilitado' : tono], destacado && !vacio && estilos.destacado]
  return <span className={clases.filter(Boolean).join(' ')}>{vacio ? SIN_VALOR : texto}</span>
}

export interface CeldaDobleLineaProps {
  principal: ReactNode
  /** Segunda línea: detalle en gris o, con `codigo`, el código del registro en color de acento. */
  detalle: ReactNode
  codigo?: boolean
}

/** Doble línea y Doble línea con código de Figma («Rama caída / INC-2026-041»). */
export function CeldaDobleLinea({ principal, detalle, codigo = false }: CeldaDobleLineaProps) {
  return (
    <span className={estilos.dobleLinea}>
      <span className={estilos.destacado}>{principal}</span>
      <span className={codigo ? estilos.codigo : estilos.detalle}>{detalle}</span>
    </span>
  )
}
