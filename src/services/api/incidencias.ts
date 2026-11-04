/**
 * Servicios de incidencias de MOD-03 (AV-274 y siguientes). Base prevista: `/api/v1/planificacion/incidencias/`.
 * El backend aún no existe: con `VITE_DATOS_SIMULADOS=true` responden los datos simulados (D9).
 */
import { DATOS_SIMULADOS } from '@/config/datosSimulados'
import type { CapatazDisponible, Clasificacion, IncidenciaDetalle, IncidenciaResumen, Inspector, SolicitudInspeccion } from '@/types/incidencias'
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

/** `GET incidencias/{id}/` (AV-274): ficha con la ubicación, el ejemplar, la descripción y quién la reportó. */
export async function obtenerIncidencia(id: number, signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularObtenerIncidencia } = await import('../simulados/incidencias')
    return simularObtenerIncidencia(id, signal)
  }
  return solicitarPlanificacion<IncidenciaDetalle>(`incidencias/${id}/`, { signal })
}

/** `POST incidencias/{id}/clasificar/` (AV-276): severidad, impacto y vía; devuelve la incidencia Clasificada. */
export async function clasificarIncidencia(id: number, cuerpo: Clasificacion) {
  if (DATOS_SIMULADOS) {
    const { simularClasificar } = await import('../simulados/incidencias')
    return simularClasificar(id, cuerpo)
  }
  return solicitarPlanificacion<IncidenciaDetalle>(`incidencias/${id}/clasificar/`, { metodo: 'POST', cuerpo })
}

/** `POST incidencias/{id}/descartar/` (AV-276): con motivo; devuelve la incidencia Descartada. */
export async function descartarIncidencia(id: number, motivo: string) {
  if (DATOS_SIMULADOS) {
    const { simularDescartar } = await import('../simulados/incidencias')
    return simularDescartar(id)
  }
  return solicitarPlanificacion<IncidenciaDetalle>(`incidencias/${id}/descartar/`, { metodo: 'POST', cuerpo: { motivo } })
}

/** `GET incidencias/inspectores/` (AV-276): ingenieros y practicantes que pueden inspeccionar en campo. */
export async function listarInspectores(signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularInspectores } = await import('../simulados/incidencias')
    return simularInspectores(signal)
  }
  return solicitarPlanificacion<Inspector[]>('incidencias/inspectores/', { signal })
}

/** `POST incidencias/{id}/inspeccion/` (AV-276): pide la inspección en campo; la incidencia sigue Registrada. */
export async function solicitarInspeccion(id: number, cuerpo: SolicitudInspeccion) {
  if (DATOS_SIMULADOS) {
    const { simularRespuestaVacia } = await import('../simulados/incidencias')
    return simularRespuestaVacia()
  }
  return solicitarPlanificacion<void>(`incidencias/${id}/inspeccion/`, { metodo: 'POST', cuerpo })
}
