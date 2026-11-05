/**
 * Tipos de proveedores, contratos y atención especial de MOD-05 (RF-SER-001, RF-SER-002 y RF-INV-011).
 * Reflejan las respuestas de `backend/.../mod05/MaestrosController` y `AtencionEspecialController`.
 */
import type { FechaIso, InstanteIso } from './comun'
import type { AlcanceEntrada } from './tercerizados'

/** Vínculo del proveedor con otras empresas. */
export type TipoVinculo = 'SinVinculo' | 'Principal' | 'Subsidiaria' | 'Vinculada'

/** Período de la frecuencia pactada de un contrato («4 veces al año»). */
export type UnidadFrecuencia = 'Dia' | 'Semana' | 'Mes' | 'Anio'

/** Proveedor con su contacto y vínculo (`GET proveedores/`). */
export interface ProveedorMaestro {
  id: number
  razon_social: string
  ruc: string | null
  activo: boolean
  contacto_nombre: string
  contacto_telefono: string
  contacto_correo: string
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
  contacto_nombre?: string
  contacto_telefono?: string
  contacto_correo?: string
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
  /** Frase de la frecuencia («4 veces al año»); en los contratos anteriores a la separación, el texto que se escribió. */
  frecuencia_pactada: string | null
  /** Nulos en los contratos anteriores a la separación (solo tienen el texto). */
  frecuencia_cantidad: number | null
  frecuencia_unidad: UnidadFrecuencia | null
  condiciones: string
  /** Vigente hoy (reloj del servidor, hora de Lima). */
  vigente: boolean
  /** Cantidad de atenciones registradas con este contrato. */
  atenciones: number
}

/** Cuerpo de `POST contratos/`. El número lo asigna el servidor. */
export interface ContratoEntrada {
  proveedor_id: number
  tipo_servicio_id: number
  area_metrado_estimado: string
  /** Decimal con hasta dos decimales, como texto. */
  monto_fijo: string
  frecuencia_cantidad: number
  frecuencia_unidad: UnidadFrecuencia
  vigencia_inicio: FechaIso
  vigencia_fin: FechaIso
  condiciones?: string
}

export interface Plaga {
  id: number
  nombre: string
  activo: boolean
}

export type EstadoAtencionEspecial = 'En seguimiento' | 'Aplicaciones completas' | 'Cancelado'

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
  cancelado: boolean
  motivo_cancelacion: string | null
  fecha_cancelacion: InstanteIso | null
  usuario_cancelacion_id: number | null
  usuario_cancelacion_nombre: string | null
}

/** Cuerpo de `POST atenciones-especiales/`. */
export interface AtencionEspecialEntrada {
  ejemplar_id: number
  plaga_id: number
  aplicaciones_adicionales: number
}

/** Cuerpo de `POST atenciones-especiales/{id}/cancelar/`. */
export interface CancelarAtencionEspecialEntrada {
  motivo?: string
}

// --- Aplicaciones adicionales (RF-FIT-006) --------------------------------------------------------------

/** Una aplicación adicional ya programada (`aplicaciones` de la ficha, `GET atenciones-especiales/{id}/`). */
export interface AplicacionAdicional {
  id: number
  codigo: string
  estado: string
  fecha_creacion: InstanteIso
}

/** Ficha del ejemplar marcado: lo de `AtencionEspecial` más el historial de sus aplicaciones adicionales. */
export interface AtencionEspecialDetalle extends AtencionEspecial {
  aplicaciones: AplicacionAdicional[]
}

/** Cuerpo de `POST atenciones-especiales/{id}/aplicaciones/`. */
export interface AplicacionAdicionalEntrada {
  contrato_id: number
  fecha_inicio: FechaIso
  fecha_fin: FechaIso
  /** Hace falta si la fecha coincide con una restricción del calendario de Planificación. */
  motivo?: string
}

// --- Plan fitosanitario estacional (RF-FIT-001) ---------------------------------------------------------

/** Las cuatro estaciones del hemisferio sur (Lima). */
export type Estacion = 'Verano' | 'Otoño' | 'Invierno' | 'Primavera'

/** Una de las aplicaciones del plan, dentro de `POST plan-fitosanitario/`. */
export interface AplicacionEstacionalEntrada {
  estacion: Estacion
  fecha_inicio: FechaIso
  fecha_fin: FechaIso
  alcances: AlcanceEntrada[]
}

/** Cuerpo de `POST plan-fitosanitario/`. Hasta cuatro aplicaciones, una por estación (RN-010). */
export interface PlanFitosanitarioEntrada {
  contrato_id: number
  aplicaciones: AplicacionEstacionalEntrada[]
  /** Hace falta si falta alguna estación o si una fecha coincide con una restricción del calendario. */
  motivo?: string
}

// --- Catálogo de productos agronómicos (RF-FIT-003) -----------------------------------------------------

/** Producto del catálogo (`GET productos-agronomicos/`). Un producto inhabilitado conserva sus referencias. */
export interface ProductoAgronomico {
  id: number
  nombre: string
  principio_activo: string
  presentacion: string
  activo: boolean
}

/** Cuerpo de `POST`/`PUT productos-agronomicos/`. */
export interface ProductoAgronomicoEntrada {
  nombre: string
  principio_activo?: string
  presentacion?: string
}

// --- Observaciones de plagas (RF-FIT-005) ---------------------------------------------------------------

/** Observación de plaga en un espacio o un ejemplar (`GET observaciones-plagas/`). No se edita: es un registro de campo. */
export interface ObservacionPlaga {
  id: number
  area_verde_id: number | null
  area_verde_nombre: string | null
  ejemplar_id: number | null
  ejemplar_codigo: string | null
  plaga_id: number
  plaga_nombre: string
  descripcion: string
  fecha_observacion: FechaIso
  usuario_creacion_id: number
  usuario_creacion_nombre: string
  fecha_creacion: InstanteIso
}

/** Cuerpo de `POST observaciones-plagas/`. Solo un área verde o un ejemplar, nunca ambos. */
export interface ObservacionPlagaEntrada {
  area_verde_id?: number
  ejemplar_id?: number
  plaga_id: number
  descripcion: string
  fecha_observacion: FechaIso
}
