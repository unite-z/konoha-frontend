/** Servicios de MOD-03 «Planificación». Las páginas no llaman a `fetch`: usan estas funciones. */
import type { FechaIso } from '@/types/comun'
import type {
  AlertaPlanificacion,
  DuracionEntrada,
  Estacion,
  FrecuenciaEntrada,
  Programacion,
  Restriccion,
  RestriccionEntrada,
  ServicioPeriodico,
  TipoRestriccion,
} from '@/types/planificacion'
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

/** `POST restricciones/` (solo jefe). Devuelve las restricciones creadas (varias si hay recurrencia). */
export function crearRestriccion(cuerpo: RestriccionEntrada) {
  return solicitarPlanificacion<Restriccion[]>('restricciones/', { metodo: 'POST', cuerpo })
}

/** `GET programaciones/?desde&hasta`: ciclos que se solapan con el periodo (máximo 400 días). */
export function listarProgramaciones(desde: FechaIso, hasta: FechaIso, signal?: AbortSignal) {
  return solicitarPlanificacion<Programacion[]>('programaciones/', { parametros: { desde, hasta }, signal })
}

/** `GET alertas/`: frecuencias a punto de vencer y duraciones excedidas, calculadas al consultar. */
export function listarAlertas(signal?: AbortSignal) {
  return solicitarPlanificacion<AlertaPlanificacion[]>('alertas/', { signal })
}

/** `DELETE restricciones/{id}/?serie=` (solo jefe): da de baja la restricción o, con `serie`, toda su serie. */
export function darDeBajaRestriccion(id: number, serie: boolean) {
  return solicitarPlanificacion<void>(`restricciones/${id}/`, { metodo: 'DELETE', parametros: { serie } })
}
