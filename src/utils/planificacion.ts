/** Lógica pura de MOD-03 «Planificación». */
import { SIN_VALOR } from './formato'

/** `HH:MM` aunque la API envíe segundos (`06:00:00`). */
export function horaCorta(hora: string | null | undefined): string | null {
  return hora ? hora.slice(0, 5) : null
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
