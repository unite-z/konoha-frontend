/** Contrato del registro de poda por ejemplar (AV-309, RF-POD-002). Claves en snake_case, como la API. */
import type { FechaIso } from './comun'

export type PrioridadPoda = 'Alta' | 'Media' | 'Baja'
export type EstadoIntervencion = 'Verificada' | 'Incompleta'

export interface IntervencionPoda {
  id: number
  ejemplar_id: number
  ejemplar_codigo: string
  categoria: string
  campana_id: number | null
  atencion_id: number | null
  incidencia_id: number | null
  tipo_intervencion_id: number | null
  tipo_intervencion_nombre: string | null
  fecha_ejecucion: FechaIso | null
  /** Texto decimal, como todas las medidas de la API. */
  reduccion_copa_pct: string | null
  ramas_laterales_cortadas: number | null
  cantidad_solicitada: string | null
  cantidad_ejecutada: string | null
  unidad_medida_id: number | null
  unidad_medida_simbolo: string | null
  prioridad: PrioridadPoda | null
  estado: EstadoIntervencion
}

export interface NuevaIntervencionPoda {
  ejemplar_id: number
  campana_id: number
  tipo_intervencion_id: number
  fecha_ejecucion: FechaIso
  incidencia_id: number | null
  reduccion_copa_pct: string | null
  ramas_laterales_cortadas: number | null
  cantidad_solicitada: string | null
  cantidad_ejecutada: string | null
  unidad_medida_id: number | null
  prioridad: PrioridadPoda | null
}

export interface OpcionCatalogoPoda {
  id: number
  nombre: string
}

export interface CatalogosRegistroPoda {
  tipos: OpcionCatalogoPoda[]
  unidades: OpcionCatalogoPoda[]
}
