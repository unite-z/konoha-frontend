/**
 * Tipos de RF-IA-003 (planificación asistida del cronograma con IA): `SugerenciaIA` de tipo cronograma.
 * Reutiliza `Modalidad` y el efecto de las restricciones de Planificación (MOD-03). Claves en snake_case (ADR 0005).
 * SUPUESTO (pendiente de confirmar con el backend): rutas `ia/cronogramas/` (como `ia/extracciones/` de RF-IA-001)
 * y este `contenido`. Al confirmar, el backend crea en MOD-03 solo las programaciones aceptadas o modificadas.
 */
import type { FechaIso } from './comun'
import type { AccionDecision, MetadatosIA, SugerenciaIAGenerica } from './ia'
import type { EfectoRestriccion } from './planificacion'
import type { Modalidad } from './reportes'

export interface SolicitudCronograma {
  desde: FechaIso
  hasta: FechaIso
  tipo_servicio_ids?: number[]
  modalidad?: Modalidad
}

/** Restricción de calendario usada por la IA (criterio 5). */
export interface RestriccionConsiderada {
  fecha_inicio: FechaIso
  fecha_fin: FechaIso
  tipo: Extract<EfectoRestriccion, 'Advertencia' | 'Prohibicion'>
  descripcion: string
  espacio: string | null
}

export interface RecursosSugeridos {
  modalidad: Modalidad
  cuadrilla_id: number | null
  cuadrilla: string | null
  proveedor_id: number | null
  proveedor: string | null
  operarios: number | null
}

/** Una sugerencia del cronograma. */
export interface PropuestaCronograma {
  clave: string
  tipo_servicio_id: number
  actividad: string
  area_verde_id: number | null
  ubicacion: string
  fecha_inicio: FechaIso
  fecha_fin: FechaIso
  recursos: RecursosSugeridos
  /** Por qué esta fecha (frecuencia, última intervención, prioridad…). */
  motivo: string
  /** Restricciones que coinciden con la propuesta (las prohibiciones exigen confirmación expresa, RI-25). */
  coincidencias: RestriccionConsiderada[]
}

/** Valores finales cuando la persona modifica (A1: decisión del usuario). */
export interface ValoresCronograma {
  fecha_inicio: FechaIso
  fecha_fin: FechaIso
  area_verde_id: number | null
  cuadrilla_id: number | null
  proveedor_id: number | null
  operarios: number | null
}

export interface DecisionPropuestaCronograma {
  accion: AccionDecision
  valores_finales: ValoresCronograma | null
  /** Confirmación expresa si coincide con una prohibición (RI-25). */
  confirma_restriccion: boolean
}

export interface DecisionCronograma {
  por_propuesta: Record<string, DecisionPropuestaCronograma>
  resumen: { aceptados: number; corregidos: number; descartados: number }
  /** Ids de ProgramacionServicio creados al confirmar (trazabilidad). */
  programaciones_creadas: number[]
  motivo_rechazo: string | null
}

export interface ContenidoCronograma extends MetadatosIA {
  version_contenido: number
  entrada: SolicitudCronograma & { actividades_pendientes: number }
  criterios: string[]
  restricciones: RestriccionConsiderada[]
  propuestas: PropuestaCronograma[]
  decision: DecisionCronograma | null
}

export interface CuerpoValidacionCronograma {
  por_propuesta: Record<string, DecisionPropuestaCronograma>
}

export type SugerenciaCronograma = SugerenciaIAGenerica<ContenidoCronograma>

/**
 * Una programación ya registrada en Planificación (MOD-03) en el periodo, para verla junto a la propuesta.
 * SUPUESTO (pendiente de que MOD-03 publique el endpoint): `GET /api/v1/planificacion/programaciones/?desde=&hasta=`.
 */
export interface ProgramacionExistente {
  id: number
  tipo_servicio_id: number
  actividad: string
  area_verde_id: number | null
  ubicacion: string
  fecha_inicio: FechaIso
  fecha_fin: FechaIso
  modalidad: Modalidad
  /** Proveedor o cuadrilla. */
  responsable: string | null
}
