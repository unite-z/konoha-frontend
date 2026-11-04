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

/** Repetición semanal: días ISO (1 lunes, 7 domingo) desde la fecha de inicio hasta `hasta` (máximo 200 fechas). */
export interface RecurrenciaRestriccion {
  dias_semana: number[]
  hasta: FechaIso
}

/** Cuerpo de `POST restricciones/`. Con `recurrencia`, crea una restricción por fecha con la misma `serie`. */
export interface RestriccionEntrada {
  tipo_restriccion_id: number
  fecha_inicio: FechaIso
  fecha_fin: FechaIso
  hora_inicio?: string
  hora_fin?: string
  area_verde_id?: number
  descripcion?: string
  recurrencia?: RecurrenciaRestriccion
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
  /** Contrato de AV-364: código del ciclo («CC-2026-11»). */
  codigo?: string | null
  /** Contrato de AV-253: transiciones con autor y hora, en el detalle. */
  historial?: EventoCiclo[]
}

/** Una transición del ciclo (AV-253): a qué estado pasó, cuándo y quién. */
export interface EventoCiclo {
  estado: EstadoProgramacion
  fecha_hora: string
  autor: string
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
  /** Contrato de AV-255: la alerta se guarda con su id para registrar el motivo (`POST alertas/{id}/motivo/`). */
  id?: number
  /** Contrato de AV-255: proveedor del ciclo («Personal propio» o la razón social) y máximo de días del servicio. */
  proveedor?: string | null
  maximo_dias?: number | null
}

/** Respuesta de `POST alertas/{id}/motivo/` (AV-255): la alerta queda atendida con su motivo y su autor. */
export interface AlertaAtendida {
  id: number
  estado: 'Atendida'
  motivo: string
  atendida_por: string
  fecha_atencion: string
}

/** `GET servicios/{id}/propuesta/`: fechas del siguiente ciclo, conflictos y primera ventana libre si los hay. */
export interface PropuestaProgramacion {
  estacion: Estacion
  fecha_inicio: FechaIso
  fecha_fin: FechaIso
  conflictos: Restriccion[]
  ventana_libre_inicio: FechaIso | null
}

/** Cuerpo de `POST programaciones/`. Con avisos, la justificación es obligatoria (máximo 300). */
export interface NuevaProgramacion {
  tipo_servicio_id: number
  proveedor_id: number | null
  fecha_inicio_prevista: FechaIso
  fecha_fin_prevista: FechaIso
  justificacion?: string
  /** Mes `AAAA-MM` de la ventana del tercerizado (AV-253); el personal propio no lo manda. */
  ventana_mes?: string
}
