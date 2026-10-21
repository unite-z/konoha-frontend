/**
 * Fechas y horas de MOD-05 en la hora de Lima (America/Lima), sin depender de la zona del navegador.
 *
 * Lima usa UTC-05:00 todo el año (sin horario de verano desde 1994), así que un valor local de un campo
 * `datetime-local` («2026-10-21T08:00») se envía como `2026-10-21T08:00:00-05:00`.
 *
 * Para mostrar instantes se usa `formatearFechaHora` de `formato.ts`, que ya convierte a la hora de Lima.
 */
import type { FechaIso, InstanteIso } from '../types/comun'

/** Desfase fijo de Lima. */
export const DESFASE_LIMA = '-05:00'

const ZONA = 'America/Lima'

/** Valor de un campo `datetime-local`: `AAAA-MM-DDTHH:mm` (los segundos, si vienen, se ignoran). */
const PATRON_LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/

const partesLima = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function partes(fecha: Date): Record<'year' | 'month' | 'day' | 'hour' | 'minute', string> {
  const valores: Record<string, string> = {}
  for (const parte of partesLima.formatToParts(fecha)) {
    if (parte.type !== 'literal') valores[parte.type] = parte.value
  }
  return valores as Record<'year' | 'month' | 'day' | 'hour' | 'minute', string>
}

/** «Ahora» en Lima, en el formato de un campo `datetime-local` (`AAAA-MM-DDTHH:mm`). */
export function ahoraLimaLocal(ahora: Date = new Date()): string {
  const p = partes(ahora)
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}

/** Fecha de hoy en Lima (`AAAA-MM-DD`). */
export function hoyLima(ahora: Date = new Date()): FechaIso {
  return ahoraLimaLocal(ahora).slice(0, 10)
}

/** Fecha en Lima (`AAAA-MM-DD`) de un instante ISO; `null` si no es válido. */
export function fechaLimaDeInstante(instante: InstanteIso): FechaIso | null {
  const fecha = new Date(instante)
  return Number.isNaN(fecha.getTime()) ? null : hoyLima(fecha)
}

/** Valor `datetime-local` (hora de Lima) de un instante ISO; `null` si no es válido. */
export function instanteALocalLima(instante: InstanteIso): string | null {
  const fecha = new Date(instante)
  return Number.isNaN(fecha.getTime()) ? null : ahoraLimaLocal(fecha)
}

/** `true` si el texto es un `AAAA-MM-DDTHH:mm` que existe en el calendario. */
export function esLocalValido(texto: string): boolean {
  const p = PATRON_LOCAL.exec(texto)
  if (!p) return false
  const [anio, mes, dia, hora, minuto] = p.slice(1, 6).map(Number)
  if (mes < 1 || mes > 12 || hora > 23 || minuto > 59) return false
  const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate()
  return dia >= 1 && dia <= ultimoDia
}

/**
 * Convierte un valor `datetime-local` interpretado en hora de Lima a un instante ISO con desfase:
 * `2026-10-21T08:00` → `2026-10-21T08:00:00-05:00`. Lanza `RangeError` si el valor no es válido.
 */
export function aInstanteLima(local: string): InstanteIso {
  if (!esLocalValido(local)) throw new RangeError(`Fecha y hora no válidas: ${local}`)
  return `${local.slice(0, 16)}:00${DESFASE_LIMA}`
}

/** Milisegundos desde la época de un instante ISO o de un valor local de Lima. `NaN` si no es válido. */
export function milisegundos(valor: string): number {
  if (esLocalValido(valor)) return Date.parse(aInstanteLima(valor))
  return Date.parse(valor)
}

/** `true` si el valor (local de Lima o instante) es posterior a `ahora`. */
export function esFuturo(valor: string, ahora: Date = new Date()): boolean {
  return milisegundos(valor) > ahora.getTime()
}
