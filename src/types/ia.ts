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
}

/** Cuerpo de `POST /ia/extracciones/{id}/validar/` (ValidacionSerializer). */
export interface CuerpoValidacion {
  decisiones: Record<string, { accion: AccionDecision; valor_final?: ValorCampo }>
}

/** Clave estable de un campo dentro de `propuesta` y `decision.por_campo`. */
export function claveCampo(campoId: number): string {
  return `campo_${campoId}`
}
