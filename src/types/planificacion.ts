/**
 * Tipos del contrato con la API de MOD-03 «Planificación» (`/api/v1/planificacion`). Claves en snake_case.
 */
import type { InstanteIso } from './comun'

export type Estacion = 'Verano' | 'Otoño' | 'Invierno' | 'Primavera'

export const ESTACIONES: readonly Estacion[] = ['Verano', 'Otoño', 'Invierno', 'Primavera']

export interface FrecuenciaEstacion {
  estacion: Estacion
  frecuencia_teorica_dias: number
  frecuencia_practica_dias: number | null
  frecuencia_maxima_dias: number | null
  fecha_modificacion: InstanteIso
  modificado_por: string
}

export interface DuracionServicio {
  duracion_maxima_dias: number
  dias_limpieza: number | null
  /** `HH:MM` */
  hora_inicio: string | null
  hora_fin: string | null
  fecha_modificacion: InstanteIso
  modificado_por: string
}

export interface ServicioPeriodico {
  id: number
  nombre: string
  es_ruidoso: boolean
  frecuencias: FrecuenciaEstacion[]
  duracion: DuracionServicio | null
}
