/**
 * Tipos del contrato con la API de MOD-03 «Planificación» (`/api/v1/planificacion`). Claves en snake_case.
 */
import type { FechaIso, InstanteIso } from './comun'

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

export interface FrecuenciaEntrada {
  frecuencia_teorica_dias: number
  frecuencia_practica_dias?: number
  frecuencia_maxima_dias?: number
}

export interface DuracionEntrada {
  duracion_maxima_dias: number
  dias_limpieza?: number
  hora_inicio?: string
  hora_fin?: string
}

export type EfectoRestriccion = 'Prohibicion' | 'Advertencia' | 'Favorable'

export interface TipoRestriccion {
  id: number
  nombre: string
  efecto: EfectoRestriccion
  aplica_servicios_ruidosos: boolean
}

export interface Restriccion {
  id: number
  tipo_restriccion_id: number
  tipo: string
  efecto: EfectoRestriccion
  aplica_servicios_ruidosos: boolean
  fecha_inicio: FechaIso
  fecha_fin: FechaIso
  hora_inicio: string | null
  hora_fin: string | null
  area_verde_id: number | null
  descripcion: string | null
  serie: string | null
}
