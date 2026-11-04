/**
 * Servicios de incidencias de MOD-03 (AV-274 y siguientes). Base prevista: `/api/v1/planificacion/incidencias/`.
 * El backend aún no existe: con `VITE_DATOS_SIMULADOS=true` responden los datos simulados (D9).
 */
import { DATOS_SIMULADOS } from '@/config/datosSimulados'
import type { IncidenciaResumen } from '@/types/incidencias'
import { solicitarPlanificacion } from './clientePlanificacion'

/** `GET incidencias/`: bandeja del jefe, de la más reciente a la más antigua. */
export async function listarIncidencias(signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularListarIncidencias } = await import('../simulados/incidencias')
    return simularListarIncidencias(signal)
  }
  return solicitarPlanificacion<IncidenciaResumen[]>('incidencias/', { signal })
}
