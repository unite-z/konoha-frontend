/**
 * Servicios de RN-IA-002: prioridades de atención con IA (`SugerenciaIA` de tipo `Priorizacion`).
 * Mismo cliente y misma base que RF-IA-001 (`ia.ts`): rutas relativas a API_BASE_URL.
 * SUPUESTO (pendiente de confirmar con el backend): `ia/priorizaciones/` con las mismas acciones que `ia/extracciones/`.
 */
import { DATOS_SIMULADOS } from '../../config/datosSimulados'
import type { Paginado } from '../../types/comun'
import type { EstadoSugerencia } from '../../types/ia'
import type { CuerpoValidacionPriorizacion, SolicitudPriorizacion, SugerenciaPriorizacion } from '../../types/priorizacionIa'
import { solicitar } from './cliente'

export interface FiltrosPriorizaciones {
  estado?: EstadoSugerencia
  /** Página de DRF (25 elementos por página). */
  page?: number
}

/** `GET ia/priorizaciones/`: bandeja paginada, de la más reciente a la más antigua. */
export async function listarPriorizaciones(filtros: FiltrosPriorizaciones = {}, signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularListarPriorizaciones } = await import('../simulados/priorizacionIa')
    return simularListarPriorizaciones(filtros, signal)
  }
  return solicitar<Paginado<SugerenciaPriorizacion>>('ia/priorizaciones/', { parametros: { ...filtros }, signal })
}

/** `POST ia/priorizaciones/`: pide una propuesta de prioridades a la IA (201). Puede tardar. */
export async function solicitarPriorizacion(cuerpo: SolicitudPriorizacion) {
  if (DATOS_SIMULADOS) {
    const { simularSolicitarPriorizacion } = await import('../simulados/priorizacionIa')
    return simularSolicitarPriorizacion(cuerpo)
  }
  return solicitar<SugerenciaPriorizacion>('ia/priorizaciones/', { metodo: 'POST', cuerpo })
}

/** `GET ia/priorizaciones/{id}/`. */
export async function obtenerPriorizacion(id: number, signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularObtenerPriorizacion } = await import('../simulados/priorizacionIa')
    return simularObtenerPriorizacion(id, signal)
  }
  return solicitar<SugerenciaPriorizacion>(`ia/priorizaciones/${id}/`, { signal })
}

/** `POST ia/priorizaciones/{id}/validar/`: decisión por elemento. */
export async function validarPriorizacion(id: number, cuerpo: CuerpoValidacionPriorizacion) {
  if (DATOS_SIMULADOS) {
    const { simularValidarPriorizacion } = await import('../simulados/priorizacionIa')
    return simularValidarPriorizacion(id, cuerpo)
  }
  return solicitar<SugerenciaPriorizacion>(`ia/priorizaciones/${id}/validar/`, { metodo: 'POST', cuerpo })
}

/** `POST ia/priorizaciones/{id}/rechazar/`: rechaza la propuesta completa. */
export async function rechazarPriorizacion(id: number, motivo: string | null) {
  if (DATOS_SIMULADOS) {
    const { simularRechazarPriorizacion } = await import('../simulados/priorizacionIa')
    return simularRechazarPriorizacion(id, motivo)
  }
  return solicitar<SugerenciaPriorizacion>(`ia/priorizaciones/${id}/rechazar/`, {
    metodo: 'POST',
    cuerpo: { motivo: motivo || null },
  })
}
