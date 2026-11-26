/**
 * Resumen e historial del área abierta en el Mapa (AV-431) y, mientras el servidor no lo tenga, las llamadas que lo
 * componían: la ficha, los ejemplares, el historial de sector y las incidencias por `area_verde_id` (AV-436).
 */
import type { IncidenciaResumen } from '@/types/incidencias'
import type { EntradaHistorialArea, ResumenArea } from '@/types/resumenArea'
import { obtenerAreaVerde, listarHistorialSectorArea } from './areasVerdes'
import { ErrorApi } from './cliente'
import { solicitarPlanificacion } from './clientePlanificacion'
import { solicitarTercerizados } from './clienteTercerizados'
import { listarEjemplaresDeArea } from './ejemplares'

const BASE = '/api/v1/inventario'
const ESTADOS_CERRADOS = ['Cerrada', 'Descartada']

/** `GET areas-verdes/{id}/resumen?page=`: una sola llamada con la ficha, los indicadores y el historial. */
export function obtenerResumenArea(areaId: number, pagina = 1, signal?: AbortSignal): Promise<ResumenArea> {
  return solicitarTercerizados<ResumenArea>(`areas-verdes/${areaId}/resumen`, {
    parametros: { page: pagina > 1 ? pagina : undefined },
    signal,
    base: BASE,
  })
}

/** `GET incidencias/?area_verde_id=`: las incidencias del área, nunca emparejadas por nombre. */
export function listarIncidenciasDeArea(areaId: number, signal?: AbortSignal): Promise<IncidenciaResumen[]> {
  return solicitarPlanificacion<IncidenciaResumen[]>('incidencias/', { signal, parametros: { area_verde_id: areaId } })
}

const opcional = <T>(promesa: Promise<T>): Promise<T | null> => promesa.catch(() => null)

/**
 * Lo que el resumen agregado ya trae, armado con las llamadas actuales en paralelo. Solo la ficha es obligatoria
 * (si falla, falla todo); lo demás queda a `null` si su llamada no responde.
 */
export async function resumenConLlamadasActuales(
  areaId: number,
  puedeVerIncidencias: boolean,
  signal?: AbortSignal,
): Promise<ResumenArea> {
  const [area, ejemplares, sectores, incidencias] = await Promise.all([
    obtenerAreaVerde(areaId, signal),
    opcional(listarEjemplaresDeArea(areaId, signal)),
    opcional(listarHistorialSectorArea(areaId, signal)),
    puedeVerIncidencias ? opcional(listarIncidenciasDeArea(areaId, signal)) : Promise.resolve(null),
  ])
  const porSituacion: Record<string, number> = {}
  for (const e of ejemplares ?? []) porSituacion[e.situacion] = (porSituacion[e.situacion] ?? 0) + 1
  const cambios: EntradaHistorialArea[] = (sectores ?? []).map((s) => ({
    tipo: 'cambio_sector',
    id: s.id,
    fecha: s.fecha_inicio,
    titulo: s.sector_nombre,
    detalle: s.fecha_fin ? `Hasta el ${s.fecha_fin}` : 'Sector actual',
    estado: s.fecha_fin ? 'finalizada' : 'vigente',
  }))
  return {
    area,
    ejemplares_por_situacion: ejemplares ? porSituacion : null,
    incidencias_abiertas: incidencias ? incidencias.filter((i) => !ESTADOS_CERRADOS.includes(i.estado)).length : null,
    ultima_atencion: null,
    proxima_actividad: null,
    prioridad_validada: null,
    fuentes_visibles: [],
    historial: { count: cambios.length, next: null, previous: null, results: cambios },
  }
}

/** Resumen agregado; si el servidor aún no lo tiene (404), las llamadas actuales en paralelo. */
export async function cargarResumenArea(
  areaId: number,
  puedeVerIncidencias: boolean,
  signal?: AbortSignal,
): Promise<ResumenArea> {
  try {
    return await obtenerResumenArea(areaId, 1, signal)
  } catch (error) {
    if (error instanceof ErrorApi && error.estado === 404)
      return resumenConLlamadasActuales(areaId, puedeVerIncidencias, signal)
    throw error
  }
}
