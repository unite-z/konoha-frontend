/**
 * Servicios de RF-IA-005: clasificación y priorización de incidencias con IA. Mismo cliente y misma base que RF-IA-001.
 * El frontend no llama a MOD-03: las incidencias pendientes las sirve MOD-06 (`pendientes/`), y al validar el backend
 * registra la clasificación oficial (estado Clasificada) sin derivar la incidencia.
 */
import { DATOS_SIMULADOS } from '@/config/datosSimulados'
import type { Paginado } from '@/types/comun'
import type {
  CuerpoClasificacionManual,
  CuerpoValidacionClasificacion,
  IncidenciaResumen,
  SugerenciaClasificacion,
} from '@/types/clasificacionIncidenciaIa'
import type { EstadoSugerencia } from '@/types/ia'
import { solicitar } from './cliente'

const BASE = 'ia/clasificaciones-incidencia/'

/**
 * `GET ia/clasificaciones-incidencia/pendientes/`: incidencias en estado Registrada.
 * SUPUESTO (pendiente de confirmar con el backend): lo sirve MOD-06 leyendo MOD-03.
 */
export async function listarIncidenciasPendientes(filtros: { q?: string; page?: number } = {}, signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularListarPendientes } = await import('../simulados/clasificacionIncidenciaIa')
    return simularListarPendientes(filtros, signal)
  }
  return solicitar<Paginado<IncidenciaResumen>>(`${BASE}pendientes/`, { parametros: { ...filtros }, signal })
}

/** `GET ia/clasificaciones-incidencia/`: análisis realizados, del más reciente al más antiguo. */
export async function listarClasificaciones(filtros: { estado?: EstadoSugerencia; page?: number } = {}, signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularListarClasificaciones } = await import('../simulados/clasificacionIncidenciaIa')
    return simularListarClasificaciones(filtros, signal)
  }
  return solicitar<Paginado<SugerenciaClasificacion>>(BASE, { parametros: { ...filtros }, signal })
}

/** `POST ia/clasificaciones-incidencia/`: pide el análisis de una incidencia a la IA (201). */
export async function solicitarClasificacion(incidenciaId: number) {
  if (DATOS_SIMULADOS) {
    const { simularSolicitarClasificacion } = await import('../simulados/clasificacionIncidenciaIa')
    return simularSolicitarClasificacion(incidenciaId)
  }
  return solicitar<SugerenciaClasificacion>(BASE, { metodo: 'POST', cuerpo: { incidencia_id: incidenciaId } })
}

/** `GET ia/clasificaciones-incidencia/{id}/`. */
export async function obtenerClasificacion(id: number, signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularObtenerClasificacion } = await import('../simulados/clasificacionIncidenciaIa')
    return simularObtenerClasificacion(id, signal)
  }
  return solicitar<SugerenciaClasificacion>(`${BASE}${id}/`, { signal })
}

/** `POST ia/clasificaciones-incidencia/{id}/validar/`: decisión por campo; registra la clasificación sin derivar. */
export async function validarClasificacion(id: number, cuerpo: CuerpoValidacionClasificacion) {
  if (DATOS_SIMULADOS) {
    const { simularValidarClasificacion } = await import('../simulados/clasificacionIncidenciaIa')
    return simularValidarClasificacion(id, cuerpo)
  }
  return solicitar<SugerenciaClasificacion>(`${BASE}${id}/validar/`, { metodo: 'POST', cuerpo })
}

/** `POST ia/clasificaciones-incidencia/{id}/rechazar/`: descarta la sugerencia (la incidencia sigue Registrada). */
export async function descartarClasificacion(id: number, motivo: string | null) {
  if (DATOS_SIMULADOS) {
    const { simularDescartarClasificacion } = await import('../simulados/clasificacionIncidenciaIa')
    return simularDescartarClasificacion(id, motivo)
  }
  return solicitar<SugerenciaClasificacion>(`${BASE}${id}/rechazar/`, { metodo: 'POST', cuerpo: { motivo: motivo || null } })
}

/**
 * `POST ia/clasificaciones-incidencia/manual/` (E1 y A1): clasificación sin sugerencia de la IA. No llama a la IA, así
 * que funciona aunque no esté disponible.
 */
export async function clasificarManual(cuerpo: CuerpoClasificacionManual) {
  if (DATOS_SIMULADOS) {
    const { simularClasificarManual } = await import('../simulados/clasificacionIncidenciaIa')
    return simularClasificarManual(cuerpo)
  }
  return solicitar<SugerenciaClasificacion>(`${BASE}manual/`, { metodo: 'POST', cuerpo })
}
