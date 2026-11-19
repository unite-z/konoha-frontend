/**
 * Tipos de RF-IA-001 (extracción de informes de proveedores con IA).
 * Reflejo exacto de SugerenciaIASerializer y ContenidoSugerenciaSerializer del back-end.
 */
import type { FechaIso, InstanteIso } from './comun'

/** EstadoSugerencia. */
export type EstadoSugerencia = 'Propuesta' | 'Validada' | 'Rechazada'

/** Texto de interfaz del estado (`etiqueta_estado`). */
export type EtiquetaEstadoSugerencia = 'Pendiente de revisión' | 'Validada' | 'Rechazada'

/** Tipos lógicos de dato del Modelo de BD v1 admitidos por la extracción. */
export type TipoDato = 'Texto' | 'Texto largo' | 'Entero' | 'Decimal' | 'Booleano' | 'Fecha' | 'JSON'

/** Acciones de revisión de un campo (CU-MOD05-025 1a). */
export type AccionDecision = 'aceptar' | 'corregir' | 'descartar'

/** Valor que puede proponer la IA o fijar el usuario. Los de tipo JSON son listas de objetos. */
export type ValorCampo = string | number | boolean | FechaIso | Record<string, unknown>[] | null

/** CampoSolicitadoSerializer. */
export interface CampoSolicitado {
  campo_id: number
  nombre_campo: string | null
  tipo_dato: TipoDato | null
  obligatorio: boolean
}

/** EntradaIASerializer. */
export interface EntradaIA {
  reporte_proveedor_id: number
  atencion_id: number
  tipo_servicio_id: number | null
  formato_id: number
  formato_version: number | null
  archivo_id: number
  campos_solicitados: CampoSolicitado[]
}

/** LlamadaIASerializer. */
export interface LlamadaIA {
  proveedor: string
  modelo: string
  solicitado_en: InstanteIso
  duracion_ms: number
}

/** ValorPropuestoSerializer. */
export interface ValorPropuesto {
  nombre_campo: string | null
  valor: ValorCampo
}

/** DecisionFinalCampoSerializer. */
export interface DecisionFinalCampo {
  accion: AccionDecision
  valor_final: ValorCampo
}

/** ResumenDecisionSerializer. */
export interface ResumenDecision {
  aceptados: number
  corregidos: number
  descartados: number
}

/** DecisionSerializer. */
export interface Decision {
  por_campo: Record<string, DecisionFinalCampo>
  resumen: ResumenDecision
  motivo_rechazo: string | null
}

/** ContenidoSugerenciaSerializer (versión 1). Las claves de `propuesta` son `campo_<id>`. */
export interface ContenidoSugerencia {
  version_contenido: number
  entrada: EntradaIA
  ia: LlamadaIA
  propuesta: Record<string, ValorPropuesto>
  campos_obligatorios_faltantes: string[]
  decision: Decision | null
}

/** AV-355: atención de MOD-05 de la propuesta (`ContextoExtracciones` del back-end). */
export interface AtencionExtraccion {
  id: number
  codigo: string
  estado: string
  tipo_servicio_id: number | null
  tipo_servicio: string | null
  proveedor: string | null
}

/** AV-355: documento analizado; `id` es el del documento asociado que pide la descarga de MOD-05. */
export interface DocumentoExtraccion {
  id: number
  archivo_id: number
  nombre: string
  categoria: string
}

/** AV-355: informe de MOD-05 de la propuesta. */
export interface InformeExtraccion {
  id: number
  revision: number
  fecha_recepcion: FechaIso | null
  resumen: string | null
  documento: DocumentoExtraccion | null
}

/** SugerenciaIASerializer. */
export interface SugerenciaIA {
  id: number
  tipo: string
  entidad: string
  registro_id: number
  archivo_id: number | null
  contenido: ContenidoSugerencia
  estado: EstadoSugerencia
  etiqueta_estado: EtiquetaEstadoSugerencia | null
  validador_id: number | null
  fecha_validacion: InstanteIso | null
  fecha_creacion: InstanteIso | null
  usuario_creacion_id: number | null
  fecha_modificacion: InstanteIso | null
  usuario_modificacion_id: number | null
  /** Atención e informe de MOD-05 (null si el back-end no los encontró). */
  atencion?: AtencionExtraccion | null
  informe?: InformeExtraccion | null
}

/** Cuerpo de `POST /ia/extracciones/{id}/validar/` (ValidacionSerializer). */
export interface CuerpoValidacion {
  decisiones: Record<string, { accion: AccionDecision; valor_final?: ValorCampo }>
}

// =============================================================================
// Genéricos de las sugerencias de IA de S12 (RN-IA-002 y siguientes)
// =============================================================================

/** Suficiencia de los datos con los que trabajó la IA (A3 de los CU de IA). */
export type SuficienciaDatos = 'suficiente' | 'parcial' | 'insuficiente'

/** Bloque común del `contenido` de las sugerencias de S12. */
export interface MetadatosIA {
  ia: LlamadaIA
  suficiencia: SuficienciaDatos
  /** Qué faltó para una recomendación confiable (vacío si la suficiencia es `suficiente`). */
  faltantes: string[]
  /** Datos de entrada que se usaron, en texto legible. */
  datos_utilizados: string[]
  /** Advertencias y límites de la propuesta. */
  limitaciones: string[]
  /** Explicación breve de los criterios. */
  explicacion: string
}

/** Sugerencia de IA (SugerenciaIA del Modelo BD 4.6.3) con los mismos campos que `SugerenciaIA` y su `contenido` tipado. */
export type SugerenciaIAGenerica<C> = Omit<SugerenciaIA, 'contenido'> & { contenido: C }

/** Clave estable de un campo dentro de `propuesta` y `decision.por_campo`. */
export function claveCampo(campoId: number): string {
  return `campo_${campoId}`
}

/** Proveedor de IA que se puede elegir en Configuración (AV-395). */
export type ProveedorIa = 'gemini' | 'deepseek'

/** `GET ia/configuracion/`: proveedor y modelo activos y los que se pueden elegir. */
export interface ConfiguracionIa {
  proveedor: ProveedorIa
  modelo: string
  /** `configuracion`: elegido en esta pantalla; `entorno`: el del servidor. */
  origen: 'configuracion' | 'entorno'
  actualizado_en?: string
  proveedores: { id: ProveedorIa; nombre: string; modelos: string[]; clave_configurada: boolean }[]
}

/** `POST ia/configuracion/probar/`. */
export interface PruebaConexionIa {
  ok: boolean
  proveedor: ProveedorIa
  modelo: string
  duracion_ms: number
  detalle?: string
}

/** Métricas de un grupo de llamadas a la IA (AV-396). `coste_usd` es nulo si ninguna tiene precio. */
export interface MetricasUsoIa {
  llamadas: number
  fallidas: number
  duracion_media_ms: number | null
  tokens_entrada: number
  tokens_salida: number
  tokens_cache: number
  coste_usd: number | null
  /** Llamadas correctas sin coste: el modelo no tiene precio o el proveedor no dio los tokens. */
  sin_coste: number
}

/** `GET ia/uso/`: uso y coste de la IA en un periodo. */
export interface UsoIa {
  desde: string
  hasta: string
  totales: MetricasUsoIa & { duracion_p95_ms: number | null }
  por_asistente: (MetricasUsoIa & { asistente: string })[]
  por_modelo: (MetricasUsoIa & { proveedor: string; modelo: string })[]
  por_dia: (MetricasUsoIa & { fecha: string })[]
  historial: {
    id: number
    solicitado_en: string
    asistente: string
    proveedor: string
    modelo: string
    duracion_ms: number
    correcto: boolean
    error: string | null
    tokens_entrada: number | null
    tokens_salida: number | null
    coste_usd: number | null
  }[]
}
