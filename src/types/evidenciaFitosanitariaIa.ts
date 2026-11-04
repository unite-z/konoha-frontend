/**
 * Tipos de RF-IA-006 (análisis de evidencia fitosanitaria con IA): `SugerenciaIA` de tipo `EvidenciaFitosanitaria`.
 * La IA solo propone hipótesis; nada se registra como diagnóstico hasta la validación técnica, y nunca se indica un
 * tratamiento. Claves en snake_case como el JSON (ADR 0005).
 * SUPUESTO (pendiente de confirmar con el backend): rutas `ia/evidencias-fitosanitarias/` (como `ia/extracciones/` de
 * RF-IA-001), con `manual/` (E1 y A1) y `{id}/fotografias/{archivo_id}/` (la imagen como blob, con la sesión).
 */
import type { MetadatosIA, SugerenciaIAGenerica } from './ia'

export type CategoriaAfectacion = 'Plaga' | 'Enfermedad' | 'DanoMecanico' | 'EstresHidrico' | 'DeficienciaNutricional' | 'Otra'

export type NivelConfianzaIA = 'Alta' | 'Media' | 'Baja' | 'Incierta'

export interface FotografiaAnalizada {
  archivo_id: number
  nombre: string
  calidad: 'Suficiente' | 'Insuficiente'
  motivo_calidad: string | null
}

export interface HipotesisFitosanitaria {
  clave: string
  categoria: CategoriaAfectacion
  /** Plaga o afectación concreta («Queresa», «Fumagina»…). */
  nombre: string
  plaga_id: number | null
  /** De 0 a 1, o `null` si la IA solo indica incertidumbre. */
  confianza: number | null
  nivel_confianza: NivelConfianzaIA
  /** Evidencias visuales que apoyan la hipótesis. */
  evidencias: string[]
}

export interface EjemplarEvidencia {
  id: number
  codigo: string
  especie: string | null
  espacio: string | null
}

export interface AtencionEvidencia {
  id: number
  codigo: string
}

export type ResultadoValidacion = 'Confirmada' | 'OtraCategoria' | 'NoConcluyente'

export interface ValidacionEvidencia {
  resultado: ResultadoValidacion
  hipotesis_clave: string | null
  categoria: CategoriaAfectacion | null
  plaga_id: number | null
  nombre: string | null
  comentario: string | null
}

export interface ContenidoEvidencia extends MetadatosIA {
  version_contenido: number
  /**
   * `manual`: evaluación registrada sin IA (E1 y A1), sin fotografías analizadas ni hipótesis.
   * SUPUESTO (pendiente del backend).
   */
  origen: 'ia' | 'manual'
  ejemplar: EjemplarEvidencia | null
  atencion: AtencionEvidencia | null
  sintomas: string | null
  fotografias: FotografiaAnalizada[]
  calidad_suficiente: boolean
  /** A3: especie no identificada, el análisis tuvo menos contexto. */
  contexto_reducido: boolean
  hipotesis: HipotesisFitosanitaria[]
  validacion: ValidacionEvidencia | null
  /** Nombre de quien validó. SUPUESTO (pendiente del backend): `SugerenciaIA` solo trae `validador_id`. */
  validada_por: string | null
}

export type CuerpoValidacionEvidencia = ValidacionEvidencia

/** Parte `datos` (JSON) del POST multipart. */
export interface DatosSolicitudEvidencia {
  ejemplar_id?: number
  atencion_id?: number
  sintomas?: string
  /** Fotografías que ya tiene la atención. Sin uso en esta versión (no hay servicio para listarlas). */
  archivo_ids?: number[]
}

/** POST ia/evidencias-fitosanitarias/manual/ (E1 y A1): evaluación sin IA. No admite `Confirmada` (no hay hipótesis). */
export interface CuerpoEvaluacionManual extends Omit<ValidacionEvidencia, 'resultado' | 'hipotesis_clave'> {
  resultado: Exclude<ResultadoValidacion, 'Confirmada'>
  ejemplar_id: number | null
  atencion_id: number | null
}

export type SugerenciaEvidencia = SugerenciaIAGenerica<ContenidoEvidencia>

/** Atención fitosanitaria especial elegible para el análisis (lectura de MOD-05). */
export interface AtencionBuscable {
  id: number
  ejemplar: EjemplarEvidencia
  plaga: string
}

/** Plaga del catálogo (lectura de MOD-05). */
export interface PlagaCatalogo {
  id: number
  nombre: string
}
