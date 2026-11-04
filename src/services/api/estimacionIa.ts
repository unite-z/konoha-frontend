/**
 * Servicios de RF-IA-004: estimación de recursos y duración con IA. Mismo cliente y misma base que RF-IA-001.
 * El frontend no llama a Operación de campo: las actividades estimables las sirve MOD-06
 * (`actividades-pendientes/`), y al confirmar solo se registra lo confirmado.
 */
import { DATOS_SIMULADOS } from '../../config/datosSimulados'
import type { Paginado } from '../../types/comun'
import type {
  ActividadEstimable,
  CuerpoRecursosManual,
  CuerpoValidacionEstimacion,
  SolicitudEstimacion,
  SugerenciaEstimacion,
} from '../../types/estimacionIa'
import type { EstadoSugerencia } from '../../types/ia'
import { solicitar } from './cliente'

export interface FiltrosEstimaciones {
  estado?: EstadoSugerencia
  /** Página de DRF (25 elementos por página). */
  page?: number
}

/** `GET ia/estimaciones/`: lista paginada, de la más reciente a la más antigua. */
export async function listarEstimaciones(filtros: FiltrosEstimaciones = {}, signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularListarEstimaciones } = await import('../simulados/estimacionIa')
    return simularListarEstimaciones(filtros, signal)
  }
  return solicitar<Paginado<SugerenciaEstimacion>>('ia/estimaciones/', { parametros: { ...filtros }, signal })
}

/**
 * `GET ia/estimaciones/actividades-pendientes/?q=`: actividades o encargos sin recursos confirmados.
 * SUPUESTO (pendiente de confirmar con el backend): lo sirve MOD-06 leyendo Operación de campo.
 */
export async function buscarActividadesEstimables(q: string, signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularBuscarActividades } = await import('../simulados/estimacionIa')
    return simularBuscarActividades(q, signal)
  }
  return solicitar<Paginado<ActividadEstimable>>('ia/estimaciones/actividades-pendientes/', { parametros: { q }, signal })
}

/** `POST ia/estimaciones/`: pide la estimación a la IA (201). */
export async function solicitarEstimacion(cuerpo: SolicitudEstimacion) {
  if (DATOS_SIMULADOS) {
    const { simularSolicitarEstimacion } = await import('../simulados/estimacionIa')
    return simularSolicitarEstimacion(cuerpo)
  }
  return solicitar<SugerenciaEstimacion>('ia/estimaciones/', { metodo: 'POST', cuerpo })
}

/** `GET ia/estimaciones/{id}/`. */
export async function obtenerEstimacion(id: number, signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularObtenerEstimacion } = await import('../simulados/estimacionIa')
    return simularObtenerEstimacion(id, signal)
  }
  return solicitar<SugerenciaEstimacion>(`ia/estimaciones/${id}/`, { signal })
}

/** `POST ia/estimaciones/{id}/validar/`: acciones por bloque y valores confirmados. */
export async function confirmarEstimacion(id: number, cuerpo: CuerpoValidacionEstimacion) {
  if (DATOS_SIMULADOS) {
    const { simularConfirmarEstimacion } = await import('../simulados/estimacionIa')
    return simularConfirmarEstimacion(id, cuerpo)
  }
  return solicitar<SugerenciaEstimacion>(`ia/estimaciones/${id}/validar/`, { metodo: 'POST', cuerpo })
}

/** `POST ia/estimaciones/{id}/rechazar/`: descarta la estimación. */
export async function descartarEstimacion(id: number, motivo: string | null) {
  if (DATOS_SIMULADOS) {
    const { simularDescartarEstimacion } = await import('../simulados/estimacionIa')
    return simularDescartarEstimacion(id, motivo)
  }
  return solicitar<SugerenciaEstimacion>(`ia/estimaciones/${id}/rechazar/`, { metodo: 'POST', cuerpo: { motivo: motivo || null } })
}

/**
 * `POST ia/estimaciones/manual/` (E1 y A1): registra los recursos sin recomendación de la IA. No llama a la IA, así
 * que funciona aunque la IA no esté disponible.
 */
export async function registrarRecursosManual(cuerpo: CuerpoRecursosManual) {
  if (DATOS_SIMULADOS) {
    const { simularRegistrarManual } = await import('../simulados/estimacionIa')
    return simularRegistrarManual(cuerpo)
  }
  return solicitar<SugerenciaEstimacion>('ia/estimaciones/manual/', { metodo: 'POST', cuerpo })
}
