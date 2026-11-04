/**
 * Lógica pura de «Mis incidencias» en el móvil (AV-282, Figma 391-8522 y 394-9964). Se prueba en
 * `misIncidencias.test.ts`.
 */
import { instanteALocalLima } from '@/utils/instanteLima'
import { masDias } from './detalleIncidencia'

/** «T-0412 · Rama caída · hace 2 h · INC-2026-041» (Figma 391-8469). */
export function textoDuplicado(duplicado: { codigo: string; tipo: string; ejemplar: string | null; fecha_registro: string }, ahora: number = Date.now()): string {
  const horas = Math.max(0, Math.floor((ahora - Date.parse(duplicado.fecha_registro)) / 3_600_000))
  const hace = horas < 1 ? 'hace un momento' : horas < 48 ? `hace ${horas} h` : `hace ${Math.floor(horas / 24)} días`
  return [duplicado.ejemplar, duplicado.tipo, hace, duplicado.codigo].filter(Boolean).join(' · ')
}

/** Cuándo se reportó: «ahora» (menos de una hora), «hoy», «ayer» o «12/10». */
export function cuandoReportada(instante: string, hoy: string, ahora: number = Date.now()): string {
  if (ahora - Date.parse(instante) < 3_600_000) return 'ahora'
  const fecha = (instanteALocalLima(instante) ?? instante).slice(0, 10)
  if (fecha === hoy) return 'hoy'
  if (fecha === masDias(hoy, -1)) return 'ayer'
  return `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`
}
