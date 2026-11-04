/**
 * Lógica pura del panel «Nueva restricción» (AV-268, Figma 364-2570): repetición semanal, fechas que genera (como
 * el backend, `CalendarioRestricciones.repeticiones`) y ciclos programados o en curso que coinciden. Se prueba en
 * `nuevaRestriccion.test.ts`. El aviso de duplicado y los ciclos afectados del backend llegan con AV-257.
 */
import type { FechaIso } from '@/types/comun'
import type { Programacion } from '@/types/planificacion'
import { sumarDias } from '../resumen/resumenPlanificacion'
import { diasDelPeriodo } from './programarCiclo'

/** El backend no admite más repeticiones por serie. */
export const MAXIMO_REPETICIONES = 200

export const DIAS_REPETICION: { valor: number; corto: string; nombre: string; plural: string }[] = [
  { valor: 1, corto: 'L', nombre: 'Lunes', plural: 'lunes' },
  { valor: 2, corto: 'M', nombre: 'Martes', plural: 'martes' },
  { valor: 3, corto: 'X', nombre: 'Miércoles', plural: 'miércoles' },
  { valor: 4, corto: 'J', nombre: 'Jueves', plural: 'jueves' },
  { valor: 5, corto: 'V', nombre: 'Viernes', plural: 'viernes' },
  { valor: 6, corto: 'S', nombre: 'Sábado', plural: 'sábados' },
  { valor: 7, corto: 'D', nombre: 'Domingo', plural: 'domingos' },
]

/** Día ISO de la semana (1 lunes, 7 domingo). */
export function diaIso(fecha: FechaIso): number {
  return ((new Date(`${fecha}T00:00:00Z`).getUTCDay() + 6) % 7) + 1
}

/** Inicios de cada repetición entre `inicio` y `hasta`, como mucho uno más que el máximo (para avisar). */
export function fechasDeRepeticion(inicio: FechaIso, hasta: FechaIso, dias: number[]): FechaIso[] {
  const fechas: FechaIso[] = []
  for (let fecha = inicio; fecha <= hasta && fechas.length <= MAXIMO_REPETICIONES; fecha = sumarDias(fecha, 1)) {
    if (dias.includes(diaIso(fecha))) fechas.push(fecha)
  }
  return fechas
}

/** «Todos los jueves · 9 fechas» o «Lunes y miércoles · 18 fechas». */
export function textoRepeticion(dias: number[], fechas: number): string {
  const nombres = DIAS_REPETICION.filter((d) => dias.includes(d.valor)).map((d) => d.plural)
  const lista = nombres.length === 1 ? `Todos los ${nombres[0]}` : `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`
  const texto = lista.charAt(0).toUpperCase() + lista.slice(1)
  return `${texto} · ${fechas === 1 ? '1 fecha' : `${fechas} fechas`}`
}

/** Error de la repetición, o `undefined` si genera entre 1 y 200 fechas. */
export function errorRepeticion(inicio: string, hasta: string, dias: number[]): { campo: 'dias' | 'hasta'; mensaje: string } | undefined {
  if (dias.length === 0) return { campo: 'dias', mensaje: 'Elige al menos un día' }
  if (!hasta) return { campo: 'hasta', mensaje: 'Indica hasta cuándo se repite' }
  if (inicio && hasta < inicio) return { campo: 'hasta', mensaje: 'No puede ser anterior a la fecha de inicio' }
  if (!inicio) return undefined
  const fechas = fechasDeRepeticion(inicio, hasta, dias).length
  if (fechas === 0) return { campo: 'dias', mensaje: 'Ningún día elegido cae entre las fechas' }
  if (fechas > MAXIMO_REPETICIONES) return { campo: 'hasta', mensaje: `Genera más de ${MAXIMO_REPETICIONES} fechas: acorta la repetición` }
  return undefined
}

/**
 * Ciclos programados o en curso que coinciden con alguna fecha de la restricción. Si el tipo solo afecta a los
 * servicios ruidosos, se descartan los que no lo son.
 */
export function ciclosAfectados(
  ciclos: Programacion[],
  inicios: FechaIso[],
  duracionDias: number,
  soloRuidosos: boolean,
  esRuidoso: (tipoServicioId: number) => boolean,
): Programacion[] {
  return ciclos.filter(
    (c) =>
      (c.estado === 'Programada' || c.estado === 'EnCurso') &&
      (!soloRuidosos || esRuidoso(c.tipo_servicio_id)) &&
      inicios.some((inicio) => inicio <= c.fecha_fin_prevista && sumarDias(inicio, duracionDias - 1) >= c.fecha_inicio_prevista),
  )
}

/** Días que dura cada repetición (de la fecha de inicio a la de fin). */
export function duracionRestriccion(inicio: FechaIso, fin: FechaIso): number {
  return fin < inicio ? 1 : diasDelPeriodo(inicio, fin)
}
