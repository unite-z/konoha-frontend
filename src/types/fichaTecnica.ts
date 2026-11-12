/** Contrato de la ficha técnica del ejemplar (AV-133, RF-INV-005). Claves en snake_case, como la API. */
import type { FechaIso, InstanteIso } from './comun'

export type OrigenEjemplar = 'Nativo' | 'Introducido' | 'Desconocido'
export type EstadoSaludEjemplar = 'Bueno' | 'Regular' | 'Malo'
export type MedidaEjemplar = 'altura_total_m' | 'altura_fuste_m' | 'dap_cm' | 'radio_copa_m'

export interface EvaluacionEjemplar {
  id: number
  fecha: FechaIso
  /** Ausencia explícita de hallazgos (HU-MOD02-012). */
  sin_hallazgos: boolean
  enfermedades_plagas: string | null
  danos_mecanicos_zunchado: string | null
  inclinacion_ramas_secas: string | null
  cavidades_pudricion: string | null
  raices_expuestas: string | null
  interferencia_infraestructura: string | null
  manejo_recomendado: string | null
  autor: string
  fecha_creacion: InstanteIso
}

export interface FichaTecnicaEjemplar {
  id: number
  codigo: string
  especie_nombre_comun: string | null
  especie_nombre_cientifico: string | null
  especie_forma_biologica: string | null
  area_verde_nombre: string | null
  /** Cuartel del área, opcional (referencia histórica). */
  cuartel_nombre: string | null
  /** Medidas en texto decimal, como todas las de la API. */
  altura_total_m: string | null
  altura_fuste_m: string | null
  dap_cm: string | null
  radio_copa_m: string | null
  origen: OrigenEjemplar | null
  estado_salud: EstadoSaludEjemplar | null
  /** Sin ninguna medida dasométrica. */
  pendiente_medir: boolean
  /** La más reciente primero. */
  evaluaciones: EvaluacionEjemplar[]
}

/** Un campo ausente no cambia; para vaciar una medida se nombra en `vaciar`. */
export interface CambioFichaTecnica {
  altura_total_m?: string
  altura_fuste_m?: string
  dap_cm?: string
  radio_copa_m?: string
  origen?: OrigenEjemplar
  estado_salud?: EstadoSaludEjemplar
  vaciar?: MedidaEjemplar[]
}

export interface NuevaEvaluacionEjemplar {
  fecha: FechaIso
  sin_hallazgos: boolean
  enfermedades_plagas: string | null
  danos_mecanicos_zunchado: string | null
  inclinacion_ramas_secas: string | null
  cavidades_pudricion: string | null
  raices_expuestas: string | null
  interferencia_infraestructura: string | null
  manejo_recomendado: string | null
}
