/**
 * Escala y marcas de los gráficos del MOD-06: eje con cifras redondas, largo de las barras y fechas cortas.
 * Lógica pura, sin interfaz.
 */
import { formatearFecha } from '../../../utils/formato'

/** Marcas del eje: 0 y cuartos de la escala. */
export const DIVISIONES_EJE = 4

export interface OpcionesEscala {
  /** Cifras enteras (conteos): el paso nunca baja de 1. */
  enteros?: boolean
  /** Valores en minutos: pasos de horas completas (salvo por debajo de una hora). */
  minutos?: boolean
}

/** Escala redonda del eje (≥ máximo): cuatro pasos de 1, 2 o 5 × 10ⁿ, para que las marcas tengan cifras limpias. */
export function escalaRedonda(maximo: number, { enteros = false, minutos = false }: OpcionesEscala = {}): number {
  if (maximo <= 0) return 0
  const enHoras = minutos && maximo > 60
  const objetivo = (enHoras ? maximo / 60 : maximo) / DIVISIONES_EJE
  const potencia = 10 ** Math.floor(Math.log10(objetivo))
  const paso = [1, 2, 5, 10].map((m) => m * potencia).find((p) => p >= objetivo - 1e-9) ?? 10 * potencia
  const pasoFinal = enteros || enHoras ? Math.max(1, paso) : paso
  return pasoFinal * DIVISIONES_EJE * (enHoras ? 60 : 1)
}

/** Textos de las marcas del eje, de 0 a la escala. */
export function marcasEje(escala: number, formatear: (valor: number) => string): string[] {
  return Array.from({ length: DIVISIONES_EJE + 1 }, (_, i) => formatear((escala * i) / DIVISIONES_EJE))
}

/** Largo de una barra (0 a 100) respecto de la escala. */
export function porcentaje(valor: number | null, escala: number): number {
  return valor !== null && escala > 0 ? Math.max(0, Math.min(100, (valor / escala) * 100)) : 0
}

/** «20 oct.» a partir de una fecha ISO. */
export function fechaCorta(fecha: string): string {
  return formatearFecha(fecha).split(' ').slice(0, 2).join(' ')
}
