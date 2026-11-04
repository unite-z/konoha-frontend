/**
 * Servicios de RF-IA-003: planificación asistida del cronograma con IA. Mismo cliente y misma base que RF-IA-001.
 * El frontend no llama a la API de Planificación (MOD-03): al confirmar, el backend crea en MOD-03 solo las
 * programaciones aceptadas o modificadas.
 */
import { DATOS_SIMULADOS } from '@/config/datosSimulados'
import type { Paginado } from '@/types/comun'
import type { FechaIso } from '@/types/comun'
import type { CuerpoValidacionCronograma, ProgramacionExistente, SolicitudCronograma, SugerenciaCronograma } from '@/types/cronogramaIa'
import type { EstadoSugerencia } from '@/types/ia'
import { solicitar } from './cliente'
import { solicitarPlanificacion } from './clientePlanificacion'

export interface FiltrosCronogramas {
  estado?: EstadoSugerencia
  /** Página de DRF (25 elementos por página). */
  page?: number
}

/** `GET ia/cronogramas/`: bandeja paginada, de la más reciente a la más antigua. */
export async function listarCronogramas(filtros: FiltrosCronogramas = {}, signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularListarCronogramas } = await import('../simulados/cronogramaIa')
    return simularListarCronogramas(filtros, signal)
  }
  return solicitar<Paginado<SugerenciaCronograma>>('ia/cronogramas/', { parametros: { ...filtros }, signal })
}

/** `POST ia/cronogramas/`: genera una propuesta de cronograma (201). Puede tardar. */
export async function solicitarCronograma(cuerpo: SolicitudCronograma) {
  if (DATOS_SIMULADOS) {
    const { simularSolicitarCronograma } = await import('../simulados/cronogramaIa')
    return simularSolicitarCronograma(cuerpo)
  }
  return solicitar<SugerenciaCronograma>('ia/cronogramas/', { metodo: 'POST', cuerpo })
}

/** `GET ia/cronogramas/{id}/`. */
export async function obtenerCronograma(id: number, signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularObtenerCronograma } = await import('../simulados/cronogramaIa')
    return simularObtenerCronograma(id, signal)
  }
  return solicitar<SugerenciaCronograma>(`ia/cronogramas/${id}/`, { signal })
}

/** `POST ia/cronogramas/{id}/validar/`: decisiones por propuesta y confirmación de la planificación. */
export async function confirmarCronograma(id: number, cuerpo: CuerpoValidacionCronograma) {
  if (DATOS_SIMULADOS) {
    const { simularConfirmarCronograma } = await import('../simulados/cronogramaIa')
    return simularConfirmarCronograma(id, cuerpo)
  }
  return solicitar<SugerenciaCronograma>(`ia/cronogramas/${id}/validar/`, { metodo: 'POST', cuerpo })
}

/** `POST ia/cronogramas/{id}/rechazar/`: descarta la propuesta completa (A2: planificación manual). */
export async function rechazarCronograma(id: number, motivo: string | null) {
  if (DATOS_SIMULADOS) {
    const { simularRechazarCronograma } = await import('../simulados/cronogramaIa')
    return simularRechazarCronograma(id, motivo)
  }
  return solicitar<SugerenciaCronograma>(`ia/cronogramas/${id}/rechazar/`, { metodo: 'POST', cuerpo: { motivo: motivo || null } })
}

/**
 * `true` cuando Planificación (MOD-03) publique el listado de programaciones. Hasta entonces, con el backend real el
 * calendario muestra solo la propuesta y las restricciones.
 * TODO: activarlo cuando MOD-03 publique `GET programaciones/` (y confirmar la ruta y los campos).
 */
const PROGRAMACION_EXISTENTE_EN_MOD03 = false

/** `true` si se puede mostrar la programación actual junto a la propuesta. */
export function programacionExistenteDisponible(): boolean {
  return DATOS_SIMULADOS || PROGRAMACION_EXISTENTE_EN_MOD03
}

/** Programación ya registrada en el periodo (MOD-03), para el calendario. Vacía mientras MOD-03 no la publique. */
export async function listarProgramacionExistente(desde: FechaIso, hasta: FechaIso, signal?: AbortSignal): Promise<ProgramacionExistente[]> {
  if (DATOS_SIMULADOS) {
    const { simularProgramacionExistente } = await import('../simulados/cronogramaIa')
    return simularProgramacionExistente(desde, hasta, signal)
  }
  if (!PROGRAMACION_EXISTENTE_EN_MOD03) return []
  return solicitarPlanificacion<ProgramacionExistente[]>('programaciones/', { parametros: { desde, hasta }, signal })
}
