/** Contrato de las campañas de poda mayor (AV-308, RF-POD-001). Claves en snake_case, como la API. */
import type { FechaIso } from './comun'

export type ClaseCampana = 'Anual' | 'Extraordinaria'
export type EstadoCampana = 'Borrador' | 'Planificada' | 'EnEjecucion' | 'Finalizada'

export interface CapacidadCampana {
  dias: number
  estimada: number
  /** Texto decimal, como todas las medidas de la API. */
  requerido_por_dia: string
  excedida: boolean
}

export interface AvanceCampana {
  verificables: number
  incompletos: number
  /** Texto decimal: verificables sobre el total de la lista. */
  porcentaje: string
}

export interface CampanaPoda {
  id: number
  anio: number
  nombre: string
  clase: ClaseCampana
  motivo_extraordinaria: string | null
  fecha_inicio: FechaIso
  fecha_fin: FechaIso
  objetivo_diario: number
  estado: EstadoCampana
  atencion_id: number | null
  total_ejemplares: number
  capacidad: CapacidadCampana
  avance: AvanceCampana
}

export interface EjemplarCampana {
  id: number
  codigo: string
  referencia_catastro: string | null
  codigo_placa_antigua: string | null
  especie_nombre_comun: string | null
  ubicacion: string | null
  area_verde_id: number | null
  estado_intervencion: 'Pendiente' | 'Incompleta' | 'Verificada'
}

export interface VentanaCierre {
  anio: number
  fecha_inicio: FechaIso
  fecha_fin: FechaIso
  duracion_maxima_dias: number
}

export interface NuevaCampana {
  nombre: string
  clase: ClaseCampana
  motivo_extraordinaria: string | null
  fecha_inicio: FechaIso
  fecha_fin: FechaIso
  objetivo_diario: number
  ejemplar_ids: number[]
  estado: 'Borrador' | 'Planificada'
}

export type CambioCampana = Partial<Omit<NuevaCampana, 'clase' | 'estado'>>

export interface PaginaApi<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
