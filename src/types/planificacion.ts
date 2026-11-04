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

/** Cuerpo de `POST restricciones/`. Pronto admitirá `recurrencia: {dias_semana, hasta}`. */
export interface RestriccionEntrada {
  tipo_restriccion_id: number
  fecha_inicio: FechaIso
  fecha_fin: FechaIso
  hora_inicio?: string
  hora_fin?: string
  area_verde_id?: number
  descripcion?: string
}

export type EstadoProgramacion = 'Programada' | 'EnCurso' | 'Completada' | 'Cancelada'

/** Ciclo de un servicio periódico (`GET programaciones/?desde&hasta`). */
export interface Programacion {
  id: number
  tipo_servicio_id: number
  servicio: string
  proveedor_id: number | null
  /** `null`: lo hace el personal propio. */
  proveedor: string | null
  estacion: Estacion
  fecha_inicio_prevista: FechaIso
  fecha_fin_prevista: FechaIso
  estado: EstadoProgramacion
  fecha_inicio_real: FechaIso | null
  fecha_fin_real: FechaIso | null
}

/**
 * Tipos de `GET alertas/`. «DuracionProxima» llegará con AV-255; mientras no llegue, no se pinta. Un tipo
 * desconocido tampoco se pinta.
 */
export type TipoAlerta = 'FrecuenciaProxima' | 'DuracionExcedida' | 'DuracionProxima'

export interface AlertaPlanificacion {
  tipo: string
  servicio_id: number
  servicio: string
  programacion_id: number | null
  /** Frecuencia: días que faltan para el máximo (negativo si ya pasó). Duración: días de exceso o que faltan. */
  dias: number
  mensaje: string
}
