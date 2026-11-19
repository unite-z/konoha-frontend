/**
 * Tonos de estado de la Guía de Estilo Web (sección 5.6) y su icono predeterminado.
 * Significado: neutral (sin evaluación), info, exito (conforme), advertencia (requiere atención),
 * error (incumple).
 */
import type { TonoEstado } from './Estado'
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

/** Tono de `Estado` (sistema de diseño) equivalente a cada tono de la Guía Web. */
export const TONO_ESTADO: Record<Tono, TonoEstado> = {
  neutral: 'neutro',
  info: 'info',
  exito: 'exito',
  advertencia: 'aviso',
  error: 'error',
}

/**
 * Traduce una insignia con tono de la Guía Web (las que devuelven `utils/`) a las props de `Estado`:
 * `<Estado {...insigniaAEstado(insigniaEstado(a.estado))} />`. Desaparece cuando las utilidades usen `TonoEstado`.
 */
export function insigniaAEstado<T extends { tono: Tono }>(insignia: T): Omit<T, 'tono'> & { tono: TonoEstado } {
  return { ...insignia, tono: TONO_ESTADO[insignia.tono] }
}
