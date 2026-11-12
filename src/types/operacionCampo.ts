import type { Paginado } from './comun'

export type PaginaCampo<T> = Paginado<T>
export interface UsuarioCampo {
  id: number
  usuario: string
  nombre: string
  rol: string
  personal_id: number | null
}
export interface PersonalCampo {
  id: number
  nombres: string
  apellidos: string
  activo: boolean
  tipo_personal: 'Capataz' | 'Operario'
  usuario_id: number | null
  cuadrilla_id: number | null
  cuadrilla_nombre: string | null
}
export interface OperarioCampo {
  id: number
  nombres: string
  apellidos: string
  activo?: boolean
}
export interface CuadrillaCampo {
  id: number
  nombre: string
  capataz_id: number
  capataz_nombre: string
  activa: boolean
  operarios: OperarioCampo[]
  cantidad_operarios: number
}
export interface EntradaCuadrilla {
  nombre: string
  capataz_id: number
  activa: boolean
  operarios: number[]
}
export interface CatalogoCampo {
  id: number
  nombre: string
  activo: boolean
}
export interface UnidadMedidaCampo {
  id: number
  nombre: string
  simbolo: string
}
export type MaterialCatalogoCampo = CatalogoCampo
export interface MaterialActividadCampo {
  id: number
  actividad_id: number
  material_id: number | null
  descripcion_otro: string | null
  nombre_material: string
  cantidad: number
  unidad_medida_id: number
  unidad_simbolo: string
  origen: string | null
  destino: string | null
}
export interface TipoActividadCampo extends CatalogoCampo {
  clase_id: number
}
export interface EntradaTipoActividadCampo {
  nombre: string
  clase_id: number
  activo: boolean
}
export interface EntradaEncargo {
  cuadrilla_id: number
  tipo_actividad_id: number
  area_verde_id: number
  descripcion: string
  periodicidad: 'Semanal' | 'Quincenal' | 'Directo'
  fecha_reunion: string | null
  fecha_inicio: string
  fecha_fin: string
  plazo_previsto: string
}
export type EstadoEncargo = 'Por completar' | 'En curso' | 'Completado' | 'Observado' | 'Cancelado'

export interface CambioEstadoEncargo {
  id: number
  estado_anterior: EstadoEncargo
  estado_nuevo: EstadoEncargo
  observaciones: string
  autor: string
  fecha: string
}

export interface EncargoCampo extends EntradaEncargo {
  estado: EstadoEncargo
  historial_estados?: CambioEstadoEncargo[]
  id: number
  capataz_id: number
  cuadrilla_nombre: string
  capataz_nombre: string
  tipo_actividad_nombre: string
  area_verde_nombre: string
}
export interface ParteCampo {
  id: number
  cuadrilla_id: number
  capataz_id: number
  fecha: string
  estado: 'Abierto' | 'Cerrado'
}
export interface ParticipantesCampo {
  actividad_id: number
  cantidad_operarios: number
  operarios: OperarioCampo[]
}
export type EstadoActividadCampo = 'Registrada' | 'Verificada' | 'Anulada'
export interface ActividadCampo {
  id: number
  parte_id: number
  cuadrilla_id: number
  capataz_id: number
  fecha: string
  estado: 'Abierto' | 'Cerrado'
  tipo_actividad_id: number
  area_verde_id: number
  fecha_hora_actividad: string
  encargo_id: number | null
  observaciones: string | null
  clase_actividad_id: number | null
  fecha_solicitud: string | null
  incidencia_id: number | null
  superficie_m2: number | null
  cantidad_solicitada: number | null
  cantidad_ejecutada: number | null
  unidad_medida_id: number | null
  tiempo_minutos: number | null
  verificacion_observaciones: string | null
  verificado_por_usuario_id: number | null
  verificado_por_nombre: string | null
  fecha_verificacion: string | null
  estado_actividad: EstadoActividadCampo
  anulada_en: string | null
  anulada_por_usuario_id: number | null
  anulada_por_nombre: string | null
  anulacion_motivo: string | null
  ejemplar_id: number | null
  ejemplar_codigo: string | null
  ejemplar_altura_m: number | null
  pendiente_vinculacion: boolean
  cuadrilla_nombre: string
  tipo_actividad_nombre: string
  area_verde_nombre: string
  participantes: ParticipantesCampo
}
export interface EntradaActividad {
  parte_id: number
  tipo_actividad_id: number
  area_verde_id: number
  fecha_hora_actividad: string
  encargo_id: number | null
  observaciones: string
  clase_actividad_id: number | null
  fecha_solicitud: string | null
  incidencia_id: number | null
  superficie_m2: number | null
  cantidad_solicitada: number | null
  cantidad_ejecutada: number | null
  unidad_medida_id: number | null
  tiempo_minutos: number | null
  ejemplar_id?: number | null
  pendiente_vinculacion?: boolean
}
