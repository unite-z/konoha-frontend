/**
 * Tipos de RF-IA-002 (revisión de posibles inconsistencias de datos con IA): `SugerenciaIA` de tipo
 * `Inconsistencia`, una por hallazgo. Claves en snake_case como el JSON (ADR 0005).
 * SUPUESTO (pendiente de confirmar con el backend): rutas `ia/inconsistencias/` (como `ia/extracciones/` de RF-IA-001)
 * y este `contenido`.
 */
import type { FechaIso } from './comun'
import type { MetadatosIA, SugerenciaIAGenerica } from './ia'

export type TipoHallazgo = 'Duplicado' | 'ValorAtipico' | 'CamposIncompatibles' | 'NombreNoNormalizado'
export type ConjuntoDatos = 'Atenciones' | 'Ejemplares' | 'AreasVerdes' | 'Proveedores'
export type NivelConfianza = 'Alta' | 'Media' | 'Baja'

/** POST ia/inconsistencias/analisis/ (cuerpo). */
export interface SolicitudAnalisisInconsistencias {
  conjunto: ConjuntoDatos
  desde?: FechaIso
  hasta?: FechaIso
}

/** Registro implicado en el hallazgo (para identificarlo y abrirlo en su módulo). */
export interface RegistroImplicado {
  entidad: string
  registro_id: number
  codigo: string | null
  etiqueta: string
  /** Campos relevantes para comparar lado a lado (clave legible → valor en texto). */
  campos: Record<string, string | null>
}

export interface PropuestaRevision {
  descripcion: string
  /** Campo afectado y valor propuesto, si la propuesta es un cambio de valor. */
  campo: string | null
  valor_propuesto: string | null
  /** En duplicados: el registro que se propone conservar. */
  registro_conservar_id: number | null
}

export interface DecisionInconsistencia {
  accion: 'aceptar' | 'descartar'
  valor_final: string | null
  comentario: string | null
}

export interface ContenidoInconsistencia extends MetadatosIA {
  version_contenido: number
  conjunto: ConjuntoDatos
  tipo_hallazgo: TipoHallazgo
  /** Dato observado (criterio 1). */
  campo_observado: string | null
  valor_observado: string | null
  registros: RegistroImplicado[]
  propuesta: PropuestaRevision
  confianza: NivelConfianza
  decision: DecisionInconsistencia | null
}

export type SugerenciaInconsistencia = SugerenciaIAGenerica<ContenidoInconsistencia>

export interface ResultadoAnalisisInconsistencias {
  analisis_id: number
  hallazgos: number
  sugerencias: SugerenciaInconsistencia[]
}

/** POST ia/inconsistencias/{id}/validar/ (cuerpo). */
export interface CuerpoAceptarInconsistencia {
  comentario?: string
  valor_final?: string
}

/** GET ia/inconsistencias/ (filtros). */
export interface FiltrosInconsistencias {
  estado?: 'Propuesta' | 'Validada' | 'Rechazada'
  tipo_hallazgo?: TipoHallazgo
  conjunto?: ConjuntoDatos
  /** Página de DRF (25 elementos por página). */
  page?: number
}
