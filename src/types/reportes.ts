/**
 * Tipos de los reportes del MOD-06.
 * Reflejo exacto de los serializers de salida de `backend/reportes_indicadores/api/serializers.py`.
 */
import type { FechaIso, Indicador, ReporteBase } from './comun'

// =============================================================================
// RF-REP-002: cumplimiento del corte de césped
// =============================================================================

/** Valores de `estado_frecuencia` (servicios/cumplimiento_corte.py). */
export type EstadoFrecuencia =
  | 'Dentro de la frecuencia'
  | 'Tolerado'
  | 'Fuera de frecuencia'
  | 'Sin ciclo anterior'
  | 'Límite no configurado'

/** Valores de `estado_duracion` (servicios/cumplimiento_corte.py). */
export type EstadoDuracion =
  | 'Dentro del máximo'
  | 'Excede el máximo'
  | 'Sin fecha de fin de corte'
  | 'Límite no configurado'

/** FilaCumplimientoSerializer. */
export interface FilaCumplimiento {
  ciclo_id: number
  estado_ciclo: string | null
  proveedor_id: number | null
  proveedor_razon_social: string | null
  ruta_id: number | null
  ruta_nombre: string | null
  estacion: string | null
  fecha_inicio_real: FechaIso
  ciclo_anterior_id: number | null
  fecha_inicio_anterior: FechaIso | null
  dias_entre_ciclos: number | null
  frecuencia_teorica_dias: number | null
  frecuencia_practica_dias: number | null
  frecuencia_maxima_dias: number | null
  estado_frecuencia: EstadoFrecuencia
  fecha_fin_corte: FechaIso | null
  dias_corte: number | null
  fecha_inicio_limpieza: FechaIso | null
  fecha_fin_limpieza: FechaIso | null
  dias_limpieza: number | null
  dias_total: number | null
  duracion_maxima_dias: number | null
  dias_limpieza_maximo: number | null
  maximo_total: number | null
  estado_duracion: EstadoDuracion
  faltantes: string[]
}

/** ResumenCumplimientoSerializer. */
export interface ResumenCumplimiento {
  total_ciclos: number
  por_estado_frecuencia: Partial<Record<EstadoFrecuencia, number>>
  por_estado_duracion: Partial<Record<EstadoDuracion, number>>
}

/** ResultadoCumplimientoCorteSerializer. RF-REP-002 no tiene filtros adicionales. */
export interface ResultadoCumplimientoCorte extends ReporteBase<Record<string, never>> {
  indicador: Indicador | null
  ciclos: FilaCumplimiento[]
  resumen: ResumenCumplimiento | null
  ultimo_ciclo: FilaCumplimiento | null
}

// =============================================================================
// RF-REP-004: distribución del personal
// =============================================================================

/** FiltrosDistribucionSerializer (y parámetros opcionales de la consulta). */
export interface FiltrosDistribucion {
  cuadrilla_id?: number
  clase_actividad_id?: number
  tipo_actividad_id?: number
  area_verde_id?: number
}

/** OperarioFilaSerializer. */
export interface OperarioFila {
  operario_id: number
  nombre_completo: string | null
  /** Sin asignación vigente en la cuadrilla del parte (apoyo eventual, CU-MOD04-011 1a). */
  es_apoyo: boolean
}

/** FilaDistribucionSerializer. */
export interface FilaDistribucion {
  jornada: FechaIso
  cuadrilla_id: number | null
  cuadrilla_nombre: string | null
  capataz_id: number | null
  capataz_nombre: string | null
  clase_actividad_id: number | null
  clase_actividad_nombre: string | null
  tipo_actividad_id: number | null
  tipo_actividad_nombre: string | null
  area_verde_id: number | null
  area_verde_nombre: string | null
  numero_actividades: number
  operarios: OperarioFila[]
  numero_operarios: number
  tiempo_minutos: number | null
  horas_persona: number | null
  superficie_m2: number | null
}

/** TotalCuadrillaJornadaSerializer (el back-end no incluye el capataz en los totales). */
export interface TotalCuadrillaJornada {
  jornada: FechaIso
  cuadrilla_id: number | null
  cuadrilla_nombre: string | null
  numero_actividades: number
  numero_operarios: number
  tiempo_minutos: number | null
  horas_persona: number | null
  superficie_m2: number | null
}

/** CuadrillaSinParteSerializer. */
export interface CuadrillaSinParte {
  jornada: FechaIso
  cuadrilla_id: number
  cuadrilla_nombre: string | null
  estado: string
}

/** ResumenDistribucionSerializer. */
export interface ResumenDistribucion {
  jornadas_con_parte: number
  partes: number
  actividades: number
  operarios_distintos: number
  horas_persona: number | null
  actividades_sin_tiempo: number
}

/** ResultadoDistribucionPersonalSerializer. */
export interface ResultadoDistribucionPersonal extends ReporteBase<FiltrosDistribucion> {
  filas: FilaDistribucion[]
  totales_por_cuadrilla_jornada: TotalCuadrillaJornada[]
  cuadrillas_sin_parte: CuadrillaSinParte[]
  resumen: ResumenDistribucion | null
}

// =============================================================================
// RF-REP-006: atenciones por espacio y sector
// =============================================================================

/** Valor especial del filtro de sector para el grupo sin sector. */
export const SIN_SECTOR = 'sin_sector'

/** Enumerado Ejecutor. */
export type Modalidad = 'PersonalPropio' | 'Tercerizado'

/** asc: menos atendidos primero; desc (por defecto): más atendidos primero. */
export type OrdenAtenciones = 'asc' | 'desc'

/** FiltrosAtencionesSerializer (y parámetros opcionales de la consulta). */
export interface FiltrosAtenciones {
  sector_id?: number | typeof SIN_SECTOR
  modalidad?: Modalidad
  area_verde_id?: number
  orden?: OrdenAtenciones
}

/** MedidasSerializer. */
export interface Medidas {
  total: number
  personal_propio: number
  tercerizado: number
  /** Tipo de atención → número. */
  por_tipo: Record<string, number>
}

/** EspacioAtencionesSerializer. */
export interface EspacioAtenciones extends Medidas {
  area_verde_id: number
  area_verde_nombre: string | null
}

/** CapatazVigenteSerializer. */
export interface CapatazVigente {
  id: number
  nombre: string | null
}

/** SectorAtencionesSerializer. `sector_id` es null en el grupo «Sin sector». */
export interface SectorAtenciones extends Medidas {
  sector_id: number | null
  sector_nombre: string | null
  atencion_a_demanda: boolean | null
  capataz_vigente: CapatazVigente | null
  espacios: EspacioAtenciones[]
}

/** CuartelAtencionesSerializer. */
export interface CuartelAtenciones {
  cuartel_id: number
  numero: number | null
  nombre: string | null
  total: number
  personal_propio: number
  tercerizado: number
}

/** ResumenAtencionesSerializer. */
export interface ResumenAtenciones {
  total_atenciones: number
  personal_propio: number
  tercerizado: number
  espacios_con_atenciones: number
  sectores_con_atenciones: number
}

/** ResultadoAtencionesEspacioSectorSerializer. */
export interface ResultadoAtencionesEspacioSector extends ReporteBase<FiltrosAtenciones> {
  indicador: Indicador | null
  por_sector: SectorAtenciones[]
  sin_espacio: Medidas | null
  por_cuartel: CuartelAtenciones[]
  resumen: ResumenAtenciones | null
  notas: string[]
}
