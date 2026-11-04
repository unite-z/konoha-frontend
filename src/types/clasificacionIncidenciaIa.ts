/**
 * Tipos de RF-IA-005 (clasificación y priorización de incidencias con IA): `SugerenciaIA` de tipo
 * `ClasificacionIncidencia`. Las enumeraciones son las de `Incidencia` (Modelo BD 4.3.16, MOD-03). Claves en
 * snake_case como el JSON (ADR 0005).
 * SUPUESTO (pendiente de confirmar con el backend): rutas `ia/clasificaciones-incidencia/` (como `ia/extracciones/`
 * de RF-IA-001), con `pendientes/` (lo sirve MOD-06 leyendo MOD-03) y `manual/` (E1 y A1).
 */
import type { FechaIso } from './comun'
import type { AccionDecision, MetadatosIA, SugerenciaIAGenerica } from './ia'

export type TipoEvento = 'Incidencia' | 'Reclamo' | 'No conformidad' | 'Hallazgo de supervisión' | 'Hallazgo de auditoría'
export type Severidad = 'Alta' | 'Media' | 'Baja'
export type ViaAtencion = 'PersonalPropio' | 'Tercerizado'

/** Incidencia en evaluación (resumen de lectura de MOD-03). */
export interface IncidenciaResumen {
  id: number
  codigo: string
  fecha_recepcion: FechaIso
  tipo_evento: TipoEvento
  descripcion: string
  canal_ingreso: string
  espacio: string | null
  ejemplar: { id: number; codigo: string; especie: string | null } | null
  fotografias: { archivo_id: number; nombre: string; url_miniatura: string | null }[]
  estado: string
}

/** Valores de clasificación (oficiales o sugeridos). */
export interface ValoresClasificacion {
  tipo_evento: TipoEvento | null
  /**
   * Subcategoría temática (Riego, Arbolado, Plagas, Infraestructura…).
   * SUPUESTO (pendiente del backend): texto sugerido por la IA, sin catálogo por ahora.
   */
  categoria: string | null
  severidad: Severidad | null
  via_atencion: ViaAtencion | null
  /** Incidencia sencilla (RN-019): se atiende en un día, como máximo en 48 horas. */
  es_sencilla: boolean | null
}

export type CampoClasificacion = keyof ValoresClasificacion

export interface AntecedenteIncidencia {
  codigo: string
  fecha: FechaIso
  tipo_evento: TipoEvento
  severidad: Severidad | null
}

export interface DecisionCampoClasificacion {
  accion: AccionDecision
  valor_final: string | boolean | null
}

export interface DecisionClasificacion {
  por_campo: Partial<Record<CampoClasificacion, DecisionCampoClasificacion>>
  valores_registrados: ValoresClasificacion
}

export interface ContenidoClasificacion extends MetadatosIA {
  version_contenido: number
  incidencia: IncidenciaResumen
  /** `null` en una clasificación manual (sin sugerencia de la IA). */
  sugerencia: ValoresClasificacion | null
  /** Explicación por campo («Tronco caído sobre vereda: riesgo para personas»). */
  motivos: Partial<Record<CampoClasificacion, string>>
  antecedentes: AntecedenteIncidencia[]
  decision: DecisionClasificacion | null
}

export type CuerpoValidacionClasificacion = Pick<DecisionClasificacion, 'por_campo'>

/** POST ia/clasificaciones-incidencia/manual/ (E1 y A1). */
export interface CuerpoClasificacionManual {
  incidencia_id: number
  valores: ValoresClasificacion
}

export type SugerenciaClasificacion = SugerenciaIAGenerica<ContenidoClasificacion>
