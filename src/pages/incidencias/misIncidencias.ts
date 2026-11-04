/**
 * Lógica pura de «Mis incidencias» en el móvil (AV-282, Figma 391-8522 y 394-9964). Se prueba en
 * `misIncidencias.test.ts`.
 */
import { instanteALocalLima } from '@/utils/instanteLima'
import { masDias } from './detalleIncidencia'

/** Cuándo se reportó: «ahora» (menos de una hora), «hoy», «ayer» o «12/10». */
export function cuandoReportada(instante: string, hoy: string, ahora: number = Date.now()): string {
  if (ahora - Date.parse(instante) < 3_600_000) return 'ahora'
  const fecha = (instanteALocalLima(instante) ?? instante).slice(0, 10)
  if (fecha === hoy) return 'hoy'
  if (fecha === masDias(hoy, -1)) return 'ayer'
  return `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`
}
