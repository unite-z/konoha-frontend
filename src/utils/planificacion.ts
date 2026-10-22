/** Lógica pura de MOD-03 «Planificación». */
import { ESTACIONES, type FrecuenciaEstacion } from '../types/planificacion'
import { SIN_VALOR, formatearNumero } from './formato'

/** Frecuencias en el orden del año (Verano, Otoño, Invierno, Primavera). */
export function ordenarPorEstacion(frecuencias: FrecuenciaEstacion[]): FrecuenciaEstacion[] {
  return [...frecuencias].sort((a, b) => ESTACIONES.indexOf(a.estacion) - ESTACIONES.indexOf(b.estacion))
}

/** «1 día», «15 días» o «—» si no hay valor. */
export function textoDias(dias: number | null | undefined): string {
  if (dias === null || dias === undefined) return SIN_VALOR
  return `${formatearNumero(dias)} ${dias === 1 ? 'día' : 'días'}`
}
