/**
 * Lógica pura del detalle de ciclo (AV-269): acciones según el estado, validación de la fecha real, duración y
 * restricciones que coinciden con el periodo. Se prueba en `detalleCiclo.test.ts`.
 */
import type { CambioEstadoCiclo } from '@/services/api/planificacion'
import type { FechaIso } from '@/types/comun'
import type { EstadoProgramacion, Programacion } from '@/types/planificacion'
import { dias, fechaCorta } from '../resumen/resumenPlanificacion'
import { diasDelPeriodo } from '../calendario/programarCiclo'

export interface AccionCiclo {
  cambio: CambioEstadoCiclo
  texto: string
  variante: 'primario' | 'secundario'
}

const ACCIONES: Record<EstadoProgramacion, AccionCiclo[]> = {
  Programada: [
    { cambio: 'cancelacion', texto: 'Cancelar ciclo', variante: 'secundario' },
    { cambio: 'inicio', texto: 'Iniciar ciclo', variante: 'primario' },
  ],
  EnCurso: [{ cambio: 'fin', texto: 'Finalizar ciclo', variante: 'primario' }],
  Completada: [],
  Cancelada: [],
}

/** Transiciones que permite el backend: Programada a En curso o Cancelada; En curso a Completada. */
export function accionesCiclo(estado: EstadoProgramacion): AccionCiclo[] {
  return ACCIONES[estado]
}

/** Inicio real si lo hay; si no, el previsto. */
export function inicioEfectivo(ciclo: Programacion): FechaIso {
  return ciclo.fecha_inicio_real ?? ciclo.fecha_inicio_prevista
}

/** Error de la fecha real de inicio o fin, o `undefined` si es válida. */
export function validarFechaReal(cambio: 'inicio' | 'fin', fecha: string, ciclo: Programacion, hoy: FechaIso): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return 'Indica la fecha.'
  if (fecha > hoy) return 'La fecha no puede ser posterior a hoy.'
  const inicio = inicioEfectivo(ciclo)
  if (cambio === 'fin' && fecha < inicio) return `El fin no puede ser anterior al inicio (${fechaCorta(inicio)}).`
  return undefined
}

export interface DuracionCiclo {
  valor: string
  contexto: string
  /** Días por encima de los previstos (0 si no se excede). */
  exceso: number
}

/** Días previstos; en curso, los transcurridos sobre los previstos; completado, los reales. */
export function duracionCiclo(ciclo: Programacion, hoy: FechaIso): DuracionCiclo {
  const previstos = diasDelPeriodo(ciclo.fecha_inicio_prevista, ciclo.fecha_fin_prevista)
  const inicio = inicioEfectivo(ciclo)
  if (ciclo.estado === 'EnCurso') {
    const transcurridos = hoy < inicio ? 0 : diasDelPeriodo(inicio, hoy)
    return { valor: `${transcurridos} de ${previstos}`, contexto: 'Días transcurridos sobre los previstos', exceso: Math.max(0, transcurridos - previstos) }
  }
  if (ciclo.estado === 'Completada' && ciclo.fecha_fin_real) {
    const reales = diasDelPeriodo(inicio, ciclo.fecha_fin_real)
    return { valor: dias(reales), contexto: `${dias(previstos)} previstos`, exceso: Math.max(0, reales - previstos) }
  }
  return { valor: dias(previstos), contexto: 'Previstos', exceso: 0 }
}

/** Periodo en el que se buscan las restricciones del ciclo: el previsto, ampliado hasta el fin real o hasta hoy si sigue en curso. */
export function periodoCiclo(ciclo: Programacion, hoy: FechaIso): { desde: FechaIso; hasta: FechaIso } {
  const desde = [ciclo.fecha_inicio_prevista, inicioEfectivo(ciclo)].sort()[0]
  const finReal = ciclo.fecha_fin_real ?? (ciclo.estado === 'EnCurso' ? hoy : ciclo.fecha_fin_prevista)
  const hasta = [ciclo.fecha_fin_prevista, finReal].sort().at(-1) ?? ciclo.fecha_fin_prevista
  return { desde, hasta }
}
