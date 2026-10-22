/** Lógica pura de MOD-03 «Planificación». */
import { ESTACIONES, type Estacion, type FrecuenciaEstacion } from '../types/planificacion'
import { SIN_VALOR, formatearNumero } from './formato'

/** Fila de la tabla de frecuencias: una por estación, configurada o no. */
export interface FilaFrecuencia {
  estacion: Estacion
  frecuencia: FrecuenciaEstacion | null
}

/** Las cuatro estaciones en el orden del año, con su frecuencia si ya está configurada. */
export function filasPorEstacion(frecuencias: FrecuenciaEstacion[]): FilaFrecuencia[] {
  return ESTACIONES.map((estacion) => ({ estacion, frecuencia: frecuencias.find((f) => f.estacion === estacion) ?? null }))
}

/** `HH:MM` aunque la API envíe segundos (`06:00:00`). */
export function horaCorta(hora: string | null | undefined): string | null {
  return hora ? hora.slice(0, 5) : null
}

/** «1 día», «15 días» o «—» si no hay valor. */
export function textoDias(dias: number | null | undefined): string {
  if (dias === null || dias === undefined) return SIN_VALOR
  return `${formatearNumero(dias)} ${dias === 1 ? 'día' : 'días'}`
}

/** «08:00 a 12:00», «Desde 08:00», «Hasta 12:00» o «—». */
export function textoHorario(conSegundosInicio: string | null, conSegundosFin: string | null): string {
  const inicio = horaCorta(conSegundosInicio)
  const fin = horaCorta(conSegundosFin)
  if (inicio && fin) return `${inicio} a ${fin}`
  if (inicio) return `Desde ${inicio}`
  if (fin) return `Hasta ${fin}`
  return SIN_VALOR
}
