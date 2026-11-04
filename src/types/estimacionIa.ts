/**
 * Tipos de RF-IA-004 (estimación de recursos y duración con IA): `SugerenciaIA` de tipo estimación de recursos.
 * Claves en snake_case como el JSON (ADR 0005).
 * SUPUESTO (pendiente de confirmar con el backend): rutas `ia/estimaciones/` (como `ia/extracciones/` de RF-IA-001),
 * con `actividades-pendientes/` (lo sirve MOD-06 leyendo Operación de campo) y `manual/` (E1 y A1).
 */
import type { FechaIso } from './comun'
import type { AccionDecision, MetadatosIA, SugerenciaIAGenerica } from './ia'

export type Complejidad = 'Baja' | 'Media' | 'Alta'
export type UnidadDuracion = 'horas' | 'jornadas'

/** Actividad o encargo de Operación de campo sin recursos confirmados (selector de la nueva estimación). */
export interface ActividadEstimable {
  /** Id de la actividad o encargo de Operación de campo. */
  actividad_id: number
  codigo: string
  tipo_actividad: string
  espacio: string | null
  fecha_prevista: FechaIso | null
}

export interface DescripcionActividad {
  tipo_servicio_id: number
  area_verde_id: number | null
  superficie_m2: number | null
  complejidad: Complejidad | null
  nota: string | null
}

export interface SolicitudEstimacion {
  actividad_id?: number
  descripcion?: DescripcionActividad
}

export interface Insumo {
  nombre: string
  cantidad: number
  /**
   * Unidad en texto libre.
   * SUPUESTO (pendiente del backend): sin catálogo de unidades en MOD-06; si el backend usa el de MOD-05, pasará a ser
   * un id de unidad.
   */
  unidad: string
}

export interface EstimacionRecursos {
  operarios_min: number
  operarios_max: number
  operarios_sugeridos: number
  duracion: number
  unidad_duracion: UnidadDuracion
  insumos: Insumo[]
}

export interface VariableConsiderada {
  nombre: string
  valor: string
}

export interface AntecedenteComparable {
  codigo: string
  fecha: FechaIso
  espacio: string | null
  operarios: number | null
  duracion_horas: number | null
}

/** Valores confirmados por la persona. */
export interface RecursosConfirmados {
  operarios: number | null
  duracion: number | null
  unidad_duracion: UnidadDuracion | null
  insumos: Insumo[]
}

/** Confirmado − estimado (criterio 2). */
export interface DiferenciaEstimacion {
  operarios: number | null
  duracion: number | null
  insumos: { nombre: string; diferencia: number; unidad: string }[]
}

/** Acción por bloque (operarios, duración e insumos) y los valores confirmados. */
export interface DecisionEstimacion {
  acciones: { operarios: AccionDecision; duracion: AccionDecision; insumos: AccionDecision }
  confirmado: RecursosConfirmados
  diferencia: DiferenciaEstimacion
}

export interface ContenidoEstimacion extends MetadatosIA {
  version_contenido: number
  actividad: ActividadEstimable | null
  descripcion: DescripcionActividad | null
  /** `null` en un registro manual (sin recomendación de la IA). */
  estimacion: EstimacionRecursos | null
  variables: VariableConsiderada[]
  antecedentes: AntecedenteComparable[]
  decision: DecisionEstimacion | null
}

export type CuerpoValidacionEstimacion = Pick<DecisionEstimacion, 'acciones' | 'confirmado'>

/** POST ia/estimaciones/manual/ (E1 y A1): recursos registrados sin recomendación. */
export interface CuerpoRecursosManual extends SolicitudEstimacion {
  confirmado: RecursosConfirmados
}

export type SugerenciaEstimacion = SugerenciaIAGenerica<ContenidoEstimacion>
