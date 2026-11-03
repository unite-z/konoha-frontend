/**
 * Badge: nombre antiguo de `Estado`. Se mantiene mientras migran las pantallas (AV-330): pinta un `Estado`
 * del sistema de diseño traduciendo los tonos de la Guía Web (`neutral` → `neutro`, `advertencia` → `aviso`).
 * En código nuevo, usa `Estado`.
 */
import Estado from './Estado'
import type { NombreIcono } from './Icono'
import { TONO_ESTADO, type Tono } from './tonos'

export type { Tono } from './tonos'

export interface BadgeProps {
  tono: Tono
  texto: string
  /** Icono en lugar del punto. */
  icono?: NombreIcono
  /** Explicación adicional (atributo `title`, también anunciada a los lectores de pantalla). */
  ayuda?: string
}

export default function Badge({ tono, texto, icono, ayuda }: BadgeProps) {
  return <Estado tono={TONO_ESTADO[tono]} texto={texto} icono={icono} ayuda={ayuda} />
}
