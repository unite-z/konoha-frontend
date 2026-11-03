/**
 * Tipos de RN-IA-002 (sugerencia de prioridades de atención con IA): `SugerenciaIA` de tipo `Priorizacion`.
 * Claves en snake_case como el JSON (ADR 0005).
 * SUPUESTO (pendiente de confirmar con el backend): rutas `ia/priorizaciones/` (como `ia/extracciones/` de RF-IA-001)
 * y este `contenido`.
 */
import type { FechaIso } from './comun'
import type { AccionDecision, MetadatosIA, SugerenciaIAGenerica } from './ia'

export type PrioridadAtencion = 'Alta' | 'Media' | 'Baja'

/** `Areas` incluye los jardines (un jardín es un área verde en el Modelo BD). */
export type AlcancePriorizacion = 'Areas' | 'Ejemplares' | 'Ambos'

/** POST ia/priorizaciones/ (cuerpo). */
export interface SolicitudPriorizacion {
  alcance: AlcancePriorizacion
  area_verde_id?: number
  tipo_servicio_id?: number
  /** Ventana que se quiere programar (días desde hoy). */
  horizonte_dias: 7 | 15 | 30
}

/** Datos que sustentan una prioridad (criterio 1). Null = no disponible para ese elemento. */
export interface SustentoPrioridad {
  incidencias_abiertas: number | null
  incidencias_ultimos_12_meses: number | null
  dias_desde_ultima_atencion: number | null
  frecuencia_mantenimiento_dias: number | null
  /** Días que lleva vencida la frecuencia (positivo = vencida). */
  dias_vencida: number | null
  estado_sanitario: string | null
  atenciones_ultimos_12_meses: number | null
}

/** Un elemento priorizado. */
export interface ElementoPriorizado {
  /** Clave estable: `area-12` o `ejemplar-345`. */
  clave: string
  tipo: 'Area' | 'Ejemplar'
  registro_id: number
  nombre: string
  codigo: string | null
  espacio: string | null
  prioridad_sugerida: PrioridadAtencion
  /** 0–100, para ordenar. */
  puntuacion: number
  motivos: string[]
  sustento: SustentoPrioridad
  /** Datos faltantes de este elemento. */
  faltantes: string[]
}

/** Decisión por elemento. `corregir` cambia la prioridad. */
export interface DecisionElementoPrioridad {
  accion: AccionDecision
  prioridad_final: PrioridadAtencion | null
}

export interface DecisionPriorizacion {
  por_elemento: Record<string, DecisionElementoPrioridad>
  resumen: { aceptados: number; corregidos: number; descartados: number }
  motivo_rechazo: string | null
}

export interface ContenidoPriorizacion extends MetadatosIA {
  version_contenido: number
  entrada: SolicitudPriorizacion & { fecha_referencia: FechaIso; elementos_evaluados: number }
  elementos: ElementoPriorizado[]
  decision: DecisionPriorizacion | null
}

/** POST ia/priorizaciones/{id}/validar/ (cuerpo). */
export interface CuerpoValidacionPriorizacion {
  por_elemento: Record<string, { accion: AccionDecision; prioridad_final?: PrioridadAtencion }>
}

export type SugerenciaPriorizacion = SugerenciaIAGenerica<ContenidoPriorizacion>
