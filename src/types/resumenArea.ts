import type { AreaVerde } from './areasVerdes'

/** Origen de una entrada del historial del área (`GET inventario/areas-verdes/{id}/resumen`, AV-431). */
export type TipoEntradaHistorialArea = 'actividad' | 'incidencia' | 'atencion' | 'cambio_sector'

export interface EntradaHistorialArea {
  tipo: TipoEntradaHistorialArea
  id: number
  fecha: string | null
  titulo: string
  detalle: string | null
  estado: string | null
}

export interface PaginaHistorialArea {
  count: number
  next: string | null
  previous: string | null
  results: EntradaHistorialArea[]
}

export interface UltimaAtencionArea {
  tipo: string
  id: number
  fecha: string | null
  titulo: string
  estado: string | null
}

export interface ProximaActividadArea {
  programacion_id: number
  tipo_servicio: string
  fecha_inicio_prevista: string
  fecha_fin_prevista: string | null
  estado: string
}

export interface PrioridadValidadaArea {
  prioridad: string
  fecha_validacion: string
  sugerencia_id: number
}

/**
 * Resumen del área abierta. Un dato cuya fuente no se puede consultar llega a `null` (o a lista vacía): la interfaz
 * no lo muestra en lugar de inventarlo.
 */
export interface ResumenArea {
  area: AreaVerde
  ejemplares_por_situacion: Record<string, number> | null
  incidencias_abiertas: number | null
  ultima_atencion: UltimaAtencionArea | null
  proxima_actividad: ProximaActividadArea | null
  prioridad_validada: PrioridadValidadaArea | null
  fuentes_visibles: string[]
  historial: PaginaHistorialArea
}
