/**
 * Lógica pura de la lista de Ciclos (AV-269): rango que se consulta, pestañas por estado con su contador, avance
 * y orden. Se prueba en `ciclos.test.ts`.
 */
import type { FechaIso } from '@/types/comun'
import type { EstadoProgramacion, Programacion } from '@/types/planificacion'
import { fechaNumerica, sumarDias } from '../resumen/resumenPlanificacion'
import { diasDelPeriodo } from '../calendario/programarCiclo'

/** Días hacia atrás y hacia delante que se consultan (el backend admite 400 como máximo). */
const DIAS_RANGO = 180

export function rangoCiclos(hoy: FechaIso): { desde: FechaIso; hasta: FechaIso } {
  return { desde: sumarDias(hoy, -DIAS_RANGO), hasta: sumarDias(hoy, DIAS_RANGO) }
}

export type PestanaCiclos = 'todos' | 'programados' | 'enCurso' | 'completados'

const ESTADO_PESTANA: Record<Exclude<PestanaCiclos, 'todos'>, EstadoProgramacion> = {
  programados: 'Programada',
  enCurso: 'EnCurso',
  completados: 'Completada',
}

export const PESTANAS_CICLOS: { valor: PestanaCiclos; texto: string }[] = [
  { valor: 'todos', texto: 'Todos' },
  { valor: 'programados', texto: 'Programados' },
  { valor: 'enCurso', texto: 'En curso' },
  { valor: 'completados', texto: 'Completados' },
]

export function ciclosDePestana(ciclos: Programacion[], pestana: PestanaCiclos): Programacion[] {
  return pestana === 'todos' ? ciclos : ciclos.filter((c) => c.estado === ESTADO_PESTANA[pestana])
}

export function contadoresCiclos(ciclos: Programacion[]): Record<PestanaCiclos, number> {
  return {
    todos: ciclos.length,
    programados: ciclosDePestana(ciclos, 'programados').length,
    enCurso: ciclosDePestana(ciclos, 'enCurso').length,
    completados: ciclosDePestana(ciclos, 'completados').length,
  }
}

const ORDEN_ESTADO: Record<EstadoProgramacion, number> = { EnCurso: 0, Programada: 1, Completada: 2, Cancelada: 3 }

/** En curso primero; después las programadas por fecha y las completadas y canceladas de la más reciente a la más antigua. */
export function ordenarCiclos(ciclos: Programacion[]): Programacion[] {
  return [...ciclos].sort((a, b) => {
    const porEstado = ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado]
    if (porEstado !== 0) return porEstado
    const porFecha = a.fecha_inicio_prevista.localeCompare(b.fecha_inicio_prevista)
    return a.estado === 'Programada' || a.estado === 'EnCurso' ? porFecha : -porFecha
  })
}

/**
 * Avance en días de un ciclo (0 a 100): completado, 100; en curso, días transcurridos desde el inicio real sobre los
 * previstos, sin pasar de 99 hasta que se finaliza; programado o cancelado, sin avance (`null`).
 */
export function avanceCiclo(ciclo: Programacion, hoy: FechaIso): number | null {
  if (ciclo.estado === 'Completada') return 100
  if (ciclo.estado !== 'EnCurso') return null
  const inicio = ciclo.fecha_inicio_real ?? ciclo.fecha_inicio_prevista
  const previstos = diasDelPeriodo(ciclo.fecha_inicio_prevista, ciclo.fecha_fin_prevista)
  const transcurridos = hoy < inicio ? 0 : diasDelPeriodo(inicio, hoy)
  return Math.min(99, Math.round((transcurridos / previstos) * 100))
}

/** «16/11 al 19/11» o «30/11», como la columna Fechas de Figma (346-1032). */
export function fechasCiclo(inicio: FechaIso, fin: FechaIso): string {
  return inicio === fin ? fechaNumerica(inicio) : `${fechaNumerica(inicio)} al ${fechaNumerica(fin)}`
}

/** Aviso que otra pantalla deja a Ciclos al llegar (`state.aviso`), como «Ciclo programado» de Figma 373-5779. */
export interface AvisoCiclos {
  mensaje: string
  detalle?: string
}

/** Lee el aviso del `state` de la navegación; `null` si no hay o no tiene la forma esperada. */
export function avisoDeEstado(estado: unknown): AvisoCiclos | null {
  if (typeof estado !== 'object' || estado === null || !('aviso' in estado)) return null
  const aviso = (estado as { aviso: unknown }).aviso
  if (typeof aviso !== 'object' || aviso === null || typeof (aviso as AvisoCiclos).mensaje !== 'string') return null
  const { mensaje, detalle } = aviso as AvisoCiclos
  return { mensaje, detalle: typeof detalle === 'string' ? detalle : undefined }
}
