/** Contrato del registro de poda por ejemplar (AV-309, RF-POD-002). Claves en snake_case, como la API. */
import type { FechaIso } from './comun'

export type PrioridadPoda = 'Alta' | 'Media' | 'Baja'
/** Solicitada: poda de altura a demanda sin fecha de ejecución todavía (AV-312). */
export type EstadoIntervencion = 'Verificada' | 'Incompleta' | 'Solicitada'
export type MotivoPodaAltura = 'Riesgo' | 'Obstruccion' | 'PlantaMuerta' | 'Reduccion'

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
  /** Solo en la poda de altura a demanda (AV-312). */
  motivo: MotivoPodaAltura | null
  /** Texto decimal: la altura del ejemplar al solicitarla. */
  altura_referencia_m: string | null
  /** Por qué va al proveedor un ejemplar de menos de 5 m (RN-005). */
  justificacion: string | null
  atencion_codigo: string | null
  atencion_estado: string | null
}

/** Cambio parcial de una intervención; al ejecutar una poda solicitada basta la fecha. */
export interface CambioIntervencionPoda {
  fecha_ejecucion?: FechaIso
}

/** Solicitud de poda de altura a demanda (AV-312, RF-POD-005). */
export interface NuevaPodaAltura {
  ejemplar_id: number
  motivo: MotivoPodaAltura
  contrato_id: number
  descripcion: string
  tipo_intervencion_id: number | null
  prioridad: PrioridadPoda | null
  incidencia_id: number | null
  justificacion: string | null
}

export interface ContratoPodaAltura {
  id: number
  numero: string
  proveedor: string
  servicio: string
  es_riesgo: boolean
  vigencia_fin: FechaIso
}

export interface EjemplarPodaAltura {
  id: number
  codigo: string
  especie_nombre_comun: string | null
  ubicacion: string | null
  /** Texto decimal. `null` si el ejemplar aún no tiene altura medida. */
  altura_total_m: string | null
  /** Mide menos de 5 m: corresponde poda menor propia (RN-005). */
  requiere_justificacion: boolean
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
