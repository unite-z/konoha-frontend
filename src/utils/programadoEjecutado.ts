/**
 * Lógica pura de la comparación de lo programado con lo ejecutado (RF-REP-010): la regla de situación (que usan
 * también los datos simulados), la desviación en días de Lima, los recuentos de los chips, los pendientes y los
 * periodos rápidos de los meses anteriores.
 */
import type { BarraGrafico } from '../components/reportes-indicadores/graficos/BarrasHorizontales'
import type { Tono } from '@/design-system/Badge'
import type { FechaIso, InstanteIso, Periodo } from '../types/comun'
import type { Modalidad } from '../types/reportes'
import type {
  ComparacionPorServicio,
  ConsultaProgramadoEjecutado,
  EjecucionVinculada,
  FilaProgramadoEjecutado,
  SituacionProgramacion,
} from '../types/reportesGestion'
import { formatearMes, formatearNumero, SIN_VALOR } from './formato'
import { fechaLimaDeInstante, hoyLima } from './instanteLima'
import { enteroPositivo } from './reportesGestion'

const MS_DIA = 86_400_000

function diaUtc(fecha: FechaIso): number {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  return Date.UTC(anio, mes - 1, dia)
}

/** Días del fin real (en Lima) frente al fin previsto: positivo = tarde; `null` sin fin real. */
export function desviacionDias(finPrevisto: FechaIso, finReal: InstanteIso | null): number | null {
  const fecha = finReal ? fechaLimaDeInstante(finReal) : null
  if (!fecha) return null
  return Math.round((diaUtc(fecha) - diaUtc(finPrevisto)) / MS_DIA)
}

/**
 * Situación de una programación según sus ejecuciones (ver `SituacionProgramacion`).
 * SUPUESTO (pendiente de confirmar con el backend): tolerancia de 0 días; con varias ejecuciones manda el fin real
 * más tardío.
 */
export function situacionDe(
  programacion: Pick<FilaProgramadoEjecutado, 'estado_programacion' | 'fin_previsto'>,
  ejecuciones: EjecucionVinculada[],
): { situacion: SituacionProgramacion; desviacion_dias: number | null } {
  if (programacion.estado_programacion === 'Cancelada') return { situacion: 'Cancelado', desviacion_dias: null }
  const fines = ejecuciones.map((e) => e.fin_real).filter((f): f is InstanteIso => f !== null)
  if (fines.length > 0) {
    const desviacion = Math.max(...fines.map((f) => desviacionDias(programacion.fin_previsto, f) ?? 0))
    return { situacion: desviacion > 0 ? 'EjecutadoConDesviacion' : 'Ejecutado', desviacion_dias: desviacion }
  }
  if (ejecuciones.some((e) => e.inicio_real !== null)) return { situacion: 'EnCurso', desviacion_dias: null }
  return { situacion: 'Pendiente', desviacion_dias: null }
}

/** Situaciones en el orden de los chips, con su texto y su insignia (nunca solo color). */
export const SITUACIONES: readonly { valor: SituacionProgramacion; texto: string; tono: Tono }[] = [
  { valor: 'Ejecutado', texto: 'Ejecutado', tono: 'exito' },
  { valor: 'EjecutadoConDesviacion', texto: 'Con desviación', tono: 'advertencia' },
  { valor: 'EnCurso', texto: 'En curso', tono: 'info' },
  { valor: 'Pendiente', texto: 'Pendiente', tono: 'neutral' },
  { valor: 'Cancelado', texto: 'Cancelado', tono: 'neutral' },
]

export function insigniaSituacion(situacion: SituacionProgramacion): { texto: string; tono: Tono } {
  const encontrada = SITUACIONES.find((s) => s.valor === situacion)
  return { texto: encontrada?.texto ?? situacion, tono: encontrada?.tono ?? 'neutral' }
}

/** Recuento de filas por situación (para los chips). */
export function contarPorSituacion(filas: FilaProgramadoEjecutado[]): Record<SituacionProgramacion, number> {
  const cuenta: Record<SituacionProgramacion, number> = {
    Ejecutado: 0,
    EjecutadoConDesviacion: 0,
    EnCurso: 0,
    Pendiente: 0,
    Cancelado: 0,
  }
  for (const fila of filas) cuenta[fila.situacion] += 1
  return cuenta
}

/** `true` si el trabajo pendiente ya debía haber terminado (fin previsto anterior a hoy en Lima). */
export function esVencido(fila: Pick<FilaProgramadoEjecutado, 'fin_previsto'>, hoy: FechaIso): boolean {
  return fila.fin_previsto < hoy
}

/** Solo los pendientes, por fin previsto (los vencidos quedan primero). */
export function ordenarPendientes(filas: FilaProgramadoEjecutado[], hoy: FechaIso): FilaProgramadoEjecutado[] {
  return filas
    .filter((f) => f.situacion === 'Pendiente')
    .sort(
      (a, b) => Number(esVencido(b, hoy)) - Number(esVencido(a, hoy)) || a.fin_previsto.localeCompare(b.fin_previsto),
    )
}

/** «+3 días», «+1 día», «En plazo» o `SIN_VALOR` (sin fin real). */
export function textoDesviacion(dias: number | null): string {
  if (dias === null) return SIN_VALOR
  if (dias <= 0) return 'En plazo'
  return `+${formatearNumero(dias)} ${dias === 1 ? 'día' : 'días'}`
}

/** Media de días de retraso de las filas con desviación, o `null` si no hay. */
export function promedioDesviacion(filas: FilaProgramadoEjecutado[]): number | null {
  const dias = filas
    .filter((f) => f.situacion === 'EjecutadoConDesviacion' && f.desviacion_dias !== null)
    .map((f) => f.desviacion_dias ?? 0)
  return dias.length === 0 ? null : dias.reduce((a, b) => a + b, 0) / dias.length
}

/** Periodo rápido de un mes: el en curso llega hasta hoy; los anteriores, completos. */
export interface MesRapido extends Periodo {
  valor: string
  texto: string
}

/** El mes en curso y los `cantidad − 1` anteriores, del más reciente al más antiguo (en Lima). */
export function mesesRecientes(cantidad = 3, ahora: Date = new Date()): MesRapido[] {
  const hoy = hoyLima(ahora)
  const [anio, mes] = hoy.split('-').map(Number)
  return Array.from({ length: cantidad }, (_, i) => {
    const inicio = new Date(Date.UTC(anio, mes - 1 - i, 1))
    const fin = new Date(Date.UTC(anio, mes - i, 0))
    const valor = inicio.toISOString().slice(0, 7)
    return {
      valor,
      texto: i === 0 ? 'Este mes' : formatearMes(valor),
      desde: `${valor}-01`,
      hasta: i === 0 ? hoy : fin.toISOString().slice(0, 10),
    }
  })
}

/** Filtros de la URL. */
export interface FiltrosUrlProgramado {
  desde: string
  hasta: string
  tipo_servicio_id: string
  area_verde_id: string
  modalidad: string
}

const MODALIDADES: readonly Modalidad[] = ['PersonalPropio', 'Tercerizado']

/** Consulta de la API con los filtros válidos de la URL (los mismos para programado y ejecutado). */
export function consultaProgramado(filtros: FiltrosUrlProgramado): ConsultaProgramadoEjecutado {
  return {
    desde: filtros.desde,
    hasta: filtros.hasta,
    tipo_servicio_id: enteroPositivo(filtros.tipo_servicio_id),
    area_verde_id: enteroPositivo(filtros.area_verde_id),
    modalidad: MODALIDADES.find((m) => m === filtros.modalidad),
  }
}

/** Barras del gráfico «Por servicio»: el servicio (programados) seguido de sus ejecutados y pendientes. */
export function barrasPorServicio(servicios: ComparacionPorServicio[]): BarraGrafico[] {
  return [...servicios]
    .sort((a, b) => b.programados - a.programados || a.tipo_servicio.localeCompare(b.tipo_servicio, 'es'))
    .flatMap((s) => {
      const grupo = String(s.tipo_servicio_id)
      return [
        { clave: grupo, texto: `${s.tipo_servicio} · programados`, valor: s.programados, esTipo: false },
        { clave: `${grupo}|ejecutados`, texto: 'Ejecutados', valor: s.ejecutados, esTipo: true, grupo },
        { clave: `${grupo}|pendientes`, texto: 'Pendientes', valor: s.pendientes, esTipo: true, grupo },
      ]
    })
}

/** Trabajos de una barra del gráfico «Por servicio» (su clave de `barrasPorServicio`) y su título. */
export function filasDeBarra(
  filas: FilaProgramadoEjecutado[],
  servicios: ComparacionPorServicio[],
  clave: string,
): { titulo: string; filas: FilaProgramadoEjecutado[] } | null {
  const [id, parte] = clave.split('|')
  const servicio = servicios.find((s) => String(s.tipo_servicio_id) === id)
  if (!servicio) return null
  const delServicio = filas.filter((f) => f.tipo_servicio === servicio.tipo_servicio)
  if (parte === 'ejecutados') {
    return {
      titulo: `${servicio.tipo_servicio}: ejecutados`,
      filas: delServicio.filter((f) => f.situacion === 'Ejecutado' || f.situacion === 'EjecutadoConDesviacion'),
    }
  }
  if (parte === 'pendientes') {
    return {
      titulo: `${servicio.tipo_servicio}: pendientes`,
      filas: delServicio.filter((f) => f.situacion === 'Pendiente'),
    }
  }
  return { titulo: `${servicio.tipo_servicio}: programados`, filas: delServicio }
}

/** Filtro de la página desde las tarjetas: una situación o solo las ejecuciones sin programar. */
export type FiltroTarjeta = 'Pendiente' | 'EjecutadoConDesviacion' | 'sin-programar'

/** «Por servicio» recalculado con las filas visibles (al filtrar la página), sin los servicios que quedan vacíos. */
export function porServicioDe(
  filas: FilaProgramadoEjecutado[],
  servicios: ComparacionPorServicio[],
): ComparacionPorServicio[] {
  return servicios
    .map((s) => {
      const propias = filas.filter((f) => f.tipo_servicio === s.tipo_servicio)
      return {
        ...s,
        programados: propias.length,
        ejecutados: propias.filter((f) => f.situacion === 'Ejecutado' || f.situacion === 'EjecutadoConDesviacion')
          .length,
        pendientes: propias.filter((f) => f.situacion === 'Pendiente').length,
      }
    })
    .filter((s) => s.programados > 0)
}
