/**
 * Tipos de proveedores, contratos y atención especial de MOD-05 (RF-SER-001, RF-SER-002 y RF-INV-011).
 * Reflejan las respuestas de `backend/.../mod05/MaestrosController` y `AtencionEspecialController`.
 */
import type { FechaIso, InstanteIso } from './comun'

/** Vínculo del proveedor con otras empresas. */
export type TipoVinculo = 'SinVinculo' | 'Principal' | 'Subsidiaria' | 'Vinculada'

/** Proveedor con su contacto y vínculo (`GET proveedores/`). */
export interface ProveedorMaestro {
  id: number
  razon_social: string
  ruc: string | null
  activo: boolean
  contacto: string
  tipo_vinculo: TipoVinculo
  proveedor_relacionado_id: number | null
  proveedor_relacionado_nombre: string | null
  /** Cantidad de contratos del proveedor. */
  contratos: number
}

/** Cuerpo de `POST proveedores/`. */
export interface ProveedorEntrada {
  razon_social: string
  ruc: string
  contacto?: string
  tipo_vinculo?: TipoVinculo
  proveedor_relacionado_id?: number
}

/** Contrato con sus condiciones (`GET contratos/`). Los precargados no traen condiciones (`null`). */
export interface ContratoMaestro {
  id: number
  numero: string
  proveedor_id: number
  proveedor_nombre: string | null
  tipo_servicio_id: number
  tipo_servicio_nombre: string | null
  vigencia_inicio: FechaIso
  vigencia_fin: FechaIso
  area_metrado_estimado: string | null
  /** Decimal de dos posiciones, como texto. */
  monto_fijo: string | null
  frecuencia_pactada: string | null
  condiciones: string
  /** Vigente hoy (reloj del servidor, hora de Lima). */
  vigente: boolean
}

/** Cuerpo de `POST contratos/`. El número lo asigna el servidor. */
export interface ContratoEntrada {
  proveedor_id: number
  tipo_servicio_id: number
  area_metrado_estimado: string
  /** Decimal con hasta dos decimales, como texto. */
  monto_fijo: string
  frecuencia_pactada: string
  vigencia_inicio: FechaIso
  vigencia_fin: FechaIso
  condiciones?: string
}

export interface Plaga {
  id: number
  nombre: string
  activo: boolean
}

export type EstadoAtencionEspecial = 'En seguimiento' | 'Aplicaciones completas'

/** Ejemplar marcado con atención fitosanitaria especial. */
export interface AtencionEspecial {
  id: number
  ejemplar_id: number
  ejemplar_codigo: string
  area_verde_id: number | null
  area_verde_nombre: string | null
  plaga_id: number
  plaga_nombre: string
  /** Una o dos al año. */
  aplicaciones_adicionales: number
  aplicaciones_realizadas: number
  estado: EstadoAtencionEspecial
  fecha_creacion: InstanteIso
}

/** Cuerpo de `POST atenciones-especiales/`. */
export interface AtencionEspecialEntrada {
  ejemplar_id: number
  plaga_id: number
  aplicaciones_adicionales: number
}
