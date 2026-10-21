/**
 * Badge (insignia de estado): Guía de Estilo Web, sección 5.6.
 *
 * Píldora de 24px con icono de 13px, texto y color. Un estado nunca se comunica solo con color:
 * cada tono lleva su icono y el texto siempre es visible.
 *
 * Tonos: neutral (sin evaluación), info, exito (conforme), advertencia (requiere atención), error (incumple).
 */
import Icono, { type NombreIcono } from './Icono'
import { ICONO_TONO, type Tono } from './tonos'
import estilos from './Badge.module.css'

export type { Tono } from './tonos'

export interface BadgeProps {
  tono: Tono
  texto: string
  /** Sustituye el icono del tono. */
  icono?: NombreIcono
  /** Explicación adicional (atributo `title`, también anunciada a los lectores de pantalla). */
  ayuda?: string
}

export default function Badge({ tono, texto, icono, ayuda }: BadgeProps) {
  return (
    <span className={`${estilos.badge} ${estilos[tono]}`} title={ayuda}>
      <Icono nombre={icono ?? ICONO_TONO[tono]} tamano="sm" />
      <span>{texto}</span>
      {ayuda && <span className="sr-only">: {ayuda}</span>}
    </span>
  )
}
