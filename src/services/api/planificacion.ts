/** Servicios de MOD-03 «Planificación». Las páginas no llaman a `fetch`: usan estas funciones. */
import type { FechaIso } from '../../types/comun'
import type { DuracionEntrada, Estacion, FrecuenciaEntrada, Restriccion, ServicioPeriodico, TipoRestriccion } from '../../types/planificacion'
import { solicitarPlanificacion } from './clientePlanificacion'

export function listarServiciosPeriodicos(signal?: AbortSignal) {
  return solicitarPlanificacion<ServicioPeriodico[]>('servicios/', { signal })
}

/** `PUT servicios/{id}/frecuencias/{estacion}/` (solo jefe). Devuelve el servicio actualizado. */
export function actualizarFrecuencia(servicioId: number, estacion: Estacion, cuerpo: FrecuenciaEntrada) {
  return solicitarPlanificacion<ServicioPeriodico>(`servicios/${servicioId}/frecuencias/${encodeURIComponent(estacion)}/`, {
    metodo: 'PUT',
    cuerpo,
  })
}

/** `PUT servicios/{id}/duracion/` (solo jefe). Devuelve el servicio actualizado. */
export function actualizarDuracion(servicioId: number, cuerpo: DuracionEntrada) {
  return solicitarPlanificacion<ServicioPeriodico>(`servicios/${servicioId}/duracion/`, { metodo: 'PUT', cuerpo })
}

export function listarTiposRestriccion(signal?: AbortSignal) {
  return solicitarPlanificacion<TipoRestriccion[]>('tipos-restriccion/', { signal })
}

/** `GET restricciones/?desde&hasta` (periodo máximo de 400 días). */
export function listarRestricciones(desde: FechaIso, hasta: FechaIso, signal?: AbortSignal) {
  return solicitarPlanificacion<Restriccion[]>('restricciones/', { parametros: { desde, hasta }, signal })
}
