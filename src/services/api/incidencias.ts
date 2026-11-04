/**
 * Servicios de incidencias de MOD-03 (AV-274 y siguientes). Base prevista: `/api/v1/planificacion/incidencias/`.
 * El backend aún no existe: con `VITE_DATOS_SIMULADOS=true` responden los datos simulados (D9).
 */
import { DATOS_SIMULADOS } from '@/config/datosSimulados'
import type { CapatazDisponible, IncidenciaResumen } from '@/types/incidencias'
import { solicitarPlanificacion } from './clientePlanificacion'

/** `GET incidencias/`: bandeja del jefe, de la más reciente a la más antigua. */
export async function listarIncidencias(signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularListarIncidencias } = await import('../simulados/incidencias')
    return simularListarIncidencias(signal)
  }
  return solicitarPlanificacion<IncidenciaResumen[]>('incidencias/', { signal })
}

/** `POST incidencias/{id}/causa-retraso/` (AV-280): causa del retraso de una alerta de plazo, con autor. */
export async function anotarCausaRetraso(incidenciaId: number, causa: string) {
  if (DATOS_SIMULADOS) {
    const { simularRespuestaVacia } = await import('../simulados/incidencias')
    return simularRespuestaVacia()
  }
  return solicitarPlanificacion<void>(`incidencias/${incidenciaId}/causa-retraso/`, { metodo: 'POST', cuerpo: { causa } })
}

/** `GET incidencias/{id}/capataces/` (AV-280): capataces a los que se puede reasignar la incidencia. */
export async function listarCapatacesDisponibles(incidenciaId: number, signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularCapataces } = await import('../simulados/incidencias')
    return simularCapataces(signal)
  }
  return solicitarPlanificacion<CapatazDisponible[]>(`incidencias/${incidenciaId}/capataces/`, { signal })
}

/** `POST incidencias/{id}/reasignar/` (AV-280): cambia el capataz a cargo; devuelve la incidencia actualizada. */
export async function reasignarIncidencia(incidenciaId: number, capatazId: number) {
  if (DATOS_SIMULADOS) {
    const { simularReasignar } = await import('../simulados/incidencias')
    return simularReasignar(incidenciaId, capatazId)
  }
  return solicitarPlanificacion<IncidenciaResumen>(`incidencias/${incidenciaId}/reasignar/`, { metodo: 'POST', cuerpo: { capataz_id: capatazId } })
}
