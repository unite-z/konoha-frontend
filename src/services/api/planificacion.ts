/** Servicios de MOD-03 «Planificación». Las páginas no llaman a `fetch`: usan estas funciones. */
import { DATOS_SIMULADOS } from '@/config/datosSimulados'
import type { FechaIso } from '@/types/comun'
import type {
  AlertaAtendida,
  AlertaPlanificacion,
  DuracionEntrada,
  Estacion,
  FrecuenciaEntrada,
  NuevaProgramacion,
  Programacion,
  PropuestaProgramacion,
  Restriccion,
  RestriccionEntrada,
  ServicioPeriodico,
  TipoRestriccion,
  ValoresIniciales,
  CambioServicio,
} from '@/types/planificacion'
import { solicitarPlanificacion } from './clientePlanificacion'

export async function listarServiciosPeriodicos(signal?: AbortSignal) {
  const servicios = await solicitarPlanificacion<ServicioPeriodico[]>('servicios/', { signal })
  if (!DATOS_SIMULADOS) return servicios
  // Hasta AV-363, la vía y el proveedor del servicio se simulan (D9).
  const { simularViaServicios } = await import('../simulados/serviciosPlanificacion')
  return simularViaServicios(servicios)
}

/** `GET servicios/{id}/valores-iniciales/` (AV-363). Hasta que exista, con `VITE_DATOS_SIMULADOS=true` se simula (D9). */
export async function obtenerValoresIniciales(servicio: ServicioPeriodico, signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularValoresIniciales } = await import('../simulados/serviciosPlanificacion')
    return simularValoresIniciales(servicio, signal)
  }
  return solicitarPlanificacion<ValoresIniciales>(`servicios/${servicio.id}/valores-iniciales/`, { signal })
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
export async function listarProgramaciones(desde: FechaIso, hasta: FechaIso, signal?: AbortSignal) {
  const ciclos = await solicitarPlanificacion<Programacion[]>('programaciones/', { parametros: { desde, hasta }, signal })
  if (!DATOS_SIMULADOS) return ciclos
  // Hasta AV-364 y AV-253, el código y el historial del ciclo se simulan (D9).
  const { simularCiclos } = await import('../simulados/ciclosPlanificacion')
  return simularCiclos(ciclos)
}

/** `GET alertas/`: frecuencias a punto de vencer y duraciones excedidas, guardadas con su id (AV-255). */
export function listarAlertas(signal?: AbortSignal) {
  return solicitarPlanificacion<AlertaPlanificacion[]>('alertas/', { signal })
}

/** `POST alertas/{id}/motivo/` (AV-255): registra el motivo o la acción de una alerta y la deja atendida. */
export function registrarMotivoAlerta(id: number, motivo: string) {
  return solicitarPlanificacion<AlertaAtendida>(`alertas/${id}/motivo/`, { metodo: 'POST', cuerpo: { motivo } })
}

/** `DELETE restricciones/{id}/?serie=` (solo jefe): da de baja la restricción o, con `serie`, toda su serie. */
export function darDeBajaRestriccion(id: number, serie: boolean) {
  return solicitarPlanificacion<void>(`restricciones/${id}/`, { metodo: 'DELETE', parametros: { serie } })
}

/** `GET servicios/{id}/propuesta/`: fechas propuestas para el siguiente ciclo (409 si falta configuración). */
export function obtenerPropuesta(servicioId: number, signal?: AbortSignal) {
  return solicitarPlanificacion<PropuestaProgramacion>(`servicios/${servicioId}/propuesta/`, { signal })
}

/** `POST programaciones/` (solo jefe): programa un ciclo. Devuelve la programación creada. */
export function crearProgramacion(cuerpo: NuevaProgramacion) {
  return solicitarPlanificacion<Programacion>('programaciones/', { metodo: 'POST', cuerpo })
}

export type CambioEstadoCiclo = 'inicio' | 'fin' | 'cancelacion'

/**
 * `POST programaciones/{id}/{inicio|fin|cancelacion}/` (solo jefe): Programada a En curso, En curso a Completada o
 * Programada a Cancelada, con la fecha real (hoy si no se indica). 409 si el estado actual no lo permite.
 */
/** `motivo`: obligatorio al cancelar con el contrato de AV-253; hasta entonces el backend lo ignora. */
export function cambiarEstadoCiclo(id: number, cambio: CambioEstadoCiclo, fecha?: FechaIso, motivo?: string) {
  return solicitarPlanificacion<Programacion>(`programaciones/${id}/${cambio}/`, {
    metodo: 'POST',
    cuerpo: { ...(fecha ? { fecha } : {}), ...(motivo ? { motivo } : {}) },
  })
}

/** `GET servicios/{id}/historial/` (AV-256), del más reciente al más antiguo. Hasta que exista, simulado (D9). */
export async function listarHistorialServicio(servicioId: number, signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularHistorialServicio } = await import('../simulados/serviciosPlanificacion')
    return simularHistorialServicio(signal)
  }
  return solicitarPlanificacion<CambioServicio[]>(`servicios/${servicioId}/historial/`, { signal })
}
