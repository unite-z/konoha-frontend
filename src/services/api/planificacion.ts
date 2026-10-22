/** Servicios de MOD-03 «Planificación». Las páginas no llaman a `fetch`: usan estas funciones. */
import type { ServicioPeriodico } from '../../types/planificacion'
import { solicitarPlanificacion } from './clientePlanificacion'

export function listarServiciosPeriodicos(signal?: AbortSignal) {
  return solicitarPlanificacion<ServicioPeriodico[]>('servicios/', { signal })
}
