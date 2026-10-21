/**
 * Tonos de estado de la Guía de Estilo Web (sección 5.6) y su icono predeterminado.
 * Significado: neutral (sin evaluación), info, exito (conforme), advertencia (requiere atención),
 * error (incumple).
 */
import type { NombreIcono } from './Icono'

export type Tono = 'neutral' | 'info' | 'exito' | 'advertencia' | 'error'

/** Icono predeterminado de cada tono: un estado nunca se comunica solo con color. */
export const ICONO_TONO: Record<Tono, NombreIcono> = {
  neutral: 'circulo',
  info: 'info',
  exito: 'verificacion',
  advertencia: 'triangulo',
  error: 'aspa',
}
