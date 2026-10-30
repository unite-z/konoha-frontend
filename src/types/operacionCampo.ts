import type { Paginado } from './comun'

export type PaginaCampo<T> = Paginado<T>
export interface UsuarioCampo { id: number; usuario: string; nombre: string; rol: string; personal_id: number | null }
export interface PersonalCampo {
  id: number; nombres: string; apellidos: string; activo: boolean
  tipo_personal: 'Capataz' | 'Operario'; usuario_id: number | null
  cuadrilla_id: number | null; cuadrilla_nombre: string | null
}
export interface OperarioCampo { id: number; nombres: string; apellidos: string; activo?: boolean }
export interface CuadrillaCampo {
  id: number; nombre: string; capataz_id: number; capataz_nombre: string; activa: boolean
  operarios: OperarioCampo[]; cantidad_operarios: number
}
export interface EntradaCuadrilla { nombre: string; capataz_id: number; activa: boolean; operarios: number[] }
export interface CatalogoCampo { id: number; nombre: string; activo: boolean }
export interface EntradaEncargo {
  cuadrilla_id: number; tipo_actividad_id: number; area_verde_id: number; descripcion: string
  periodicidad: 'Semanal' | 'Quincenal'; fecha_reunion: string; fecha_inicio: string; fecha_fin: string; plazo_previsto: string
}
export interface EncargoCampo extends EntradaEncargo {
  /** Sin estado de negocio disponible hasta integrar el contrato de seguimiento. */
  estado: string | null
  id: number; capataz_id: number; cuadrilla_nombre: string; capataz_nombre: string; tipo_actividad_nombre: string; area_verde_nombre: string
}
export interface ParteCampo { id: number; cuadrilla_id: number; capataz_id: number; fecha: string; estado: 'Abierto' | 'Cerrado' }
export interface ParticipantesCampo { actividad_id: number; cantidad_operarios: number; operarios: OperarioCampo[] }
export interface ActividadCampo {
  id: number; parte_id: number; cuadrilla_id: number; capataz_id: number; fecha: string; estado: 'Abierto' | 'Cerrado'
  tipo_actividad_id: number; area_verde_id: number; fecha_hora_actividad: string; encargo_id: number | null; observaciones: string | null
  cuadrilla_nombre: string; tipo_actividad_nombre: string; area_verde_nombre: string; participantes: ParticipantesCampo
}
export interface EntradaActividad {
  parte_id: number; tipo_actividad_id: number; area_verde_id: number; fecha_hora_actividad: string; encargo_id: number | null; observaciones: string
}
