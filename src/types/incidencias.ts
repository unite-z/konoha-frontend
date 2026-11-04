/**
 * Tipos del contrato de incidencias de MOD-03 (AV-274 registro, AV-280 alertas de plazo). Claves en snake_case.
 * El backend aún no existe: los servicios responden con `services/simulados/incidencias.ts` (D9).
 */
import type { InstanteIso } from './comun'

/** Los 8 estados de AV-274. */
export type EstadoIncidencia =
  | 'Registrada'
  | 'Clasificada'
  | 'DerivadaInterna'
  | 'DerivadaTercerizada'
  | 'EnAtencion'
  | 'Atendida'
  | 'Cerrada'
  | 'Descartada'

export type SeveridadIncidencia = 'Baja' | 'Media' | 'Alta'

/** Vía (glosario de AV-250): personal propio (encargo de MOD-04) o tercerizada (requerimiento de MOD-05). */
export type ViaIncidencia = 'PersonalPropio' | 'Tercerizada'

export type CanalIncidencia = 'App' | 'Web' | 'Telefono' | 'WhatsApp' | 'Correo' | 'Presencial'

/** Fila de la bandeja (`GET incidencias/`). */
export interface IncidenciaResumen {
  id: number
  codigo: string
  tipo: string
  /** Incidencia sencilla (RN-019): plazo objetivo de 1 día y máximo de 48 h. */
  tipo_sencilla: boolean
  espacio: string
  severidad: SeveridadIncidencia | null
  via: ViaIncidencia | null
  estado: EstadoIncidencia
  canal: CanalIncidencia
  fecha_registro: InstanteIso
  fecha_cierre: InstanteIso | null
  /** Capataz o proveedor a cargo, si ya se derivó. */
  responsable: string | null
}

/**
 * Capataz al que se puede reasignar o encargar una incidencia (`GET incidencias/{id}/capataces/?fecha=`, AV-280 y
 * AV-277), con la carga de su cuadrilla ese día: libre si tiene menos encargos que su capacidad.
 */
export interface CapatazDisponible {
  id: number
  nombre: string
  cuadrilla: string
  carga?: { asignados: number; capacidad: number }
}

export type ImpactoIncidencia = 'Alto' | 'Medio' | 'Bajo'

/** Ficha de una incidencia (`GET incidencias/{id}/`, AV-274 y AV-276). */
export interface IncidenciaDetalle extends IncidenciaResumen {
  zona: string | null
  descripcion: string
  /** Ejemplar del inventario de MOD-02, si lo hay («T-0412 · Ficus · 7 m»). */
  ejemplar: { codigo: string; especie: string; altura_m: number | null } | null
  reportado_por: string
  impacto: ImpactoIncidencia | null
  /** Foto de la evidencia; `null` sin foto. */
  foto_url: string | null
  /** Derivada a tercerizado: el requerimiento de MOD-05 y su avance (AV-278, Figma 394-9194). */
  requerimiento?: RequerimientoIncidencia | null
  /** El último encargo interno se canceló y hay que derivarla de nuevo (AV-277, Figma 390-8582). */
  encargo_cancelado?: { codigo: string; motivo: string } | null
  /** Atendida: quién y cuándo, el encargo y la evidencia que dejó (AV-279, Figma 390-8008). */
  atencion?: AtencionIncidencia | null
  /** Cerrada: minutos desde el registro hasta el cierre y a quién se avisó (AV-279, Figma 390-7811). */
  cierre?: { minutos: number; avisado_a: string | null } | null
  /** Transiciones, de la más reciente a la más antigua; «Sistema» en las automáticas. */
  historial?: EventoIncidencia[]
}

export interface AtencionIncidencia {
  atendida_por: string
  atendida_en: InstanteIso
  encargo_codigo: string | null
  /** Fotos de la evidencia (`url` nula mientras no haya almacén de archivos). */
  evidencias: { id: number; url: string | null }[]
}

export interface EventoIncidencia {
  /** «Atendida · Sistema (encargo terminado)». */
  texto: string
  fecha_hora: InstanteIso
}

export type EstadoPaso = 'Hecho' | 'EnCurso' | 'Pendiente'

export interface RequerimientoIncidencia {
  /** «REQ-2026-044». */
  codigo: string
  proveedor: string
  tipo_atencion: 'Programada' | 'Extraordinaria'
  /** Requerimiento, orden de compra, informe del proveedor y conformidad, con su fecha si ya se hizo. */
  pasos: { nombre: string; estado: EstadoPaso; fecha: string | null }[]
}

/**
 * Cuerpo de `POST incidencias/{id}/clasificar/` (AV-276). `motivo_cambio_via` es obligatorio si la vía no es la
 * sugerida (un árbol de 5 m o más sugiere el proveedor tercerizado).
 */
export interface Clasificacion {
  severidad: SeveridadIncidencia
  impacto: ImpactoIncidencia
  via: ViaIncidencia
  motivo_cambio_via?: string
}

/** Cuerpo de `POST incidencias/{id}/inspeccion/` (AV-276): inspección en campo antes de clasificar. */
export interface SolicitudInspeccion {
  responsable_id: number
  que_verificar?: string
}

/** Ingeniero o practicante que puede inspeccionar (`GET incidencias/inspectores/`, AV-276). */
export interface Inspector {
  id: number
  nombre: string
}

/** Cuerpo de `POST incidencias/{id}/encargo/` (AV-277): encargo directo a un capataz (vía personal propio). */
export interface NuevoEncargo {
  capataz_id: number
  espacio: string
  actividad: string
  /** Fecha límite `AAAA-MM-DD`. */
  plazo: string
  /** Lo que va con el encargo: foto, descripción y ejemplar. */
  incluye: string[]
  avisar_capataz: boolean
}

/** Proveedor que puede atender una incidencia, con sus contratos (`GET incidencias/{id}/proveedores/`, AV-278). */
export interface ProveedorIncidencia {
  id: number
  razon_social: string
  contratos: { id: number; codigo: string; vigente: boolean; servicios: string[] }[]
}

export type TipoAtencion = 'Programada' | 'Extraordinaria'

/**
 * Cuerpo de `POST incidencias/{id}/requerimiento/` (AV-278): requerimiento al proveedor por la vía tercerizada. Sin
 * contrato aplicable, va como extraordinaria con orden de servicio (`contrato_id` nulo).
 */
export interface NuevoRequerimiento {
  proveedor_id: number
  contrato_id: number | null
  servicio: string | null
  tipo_atencion: TipoAtencion
  /** Crear también la poda del ejemplar (si lo hay). */
  crear_poda: boolean
}

/** Cuerpo de `POST incidencias/{id}/devolver/` (AV-279): vuelve a En atención con observaciones obligatorias. */
export interface Devolucion {
  observaciones: string
}

/** Catálogos del registro de incidencias desde la oficina (`GET incidencias/catalogos-registro/`, AV-274). */
export interface CatalogosRegistro {
  tipos: string[]
  espacios: { nombre: string; ejemplares: string[] }[]
  usuarios: { id: number; nombre: string }[]
}

/**
 * Cuerpo de `POST incidencias/` (AV-274, HU-020): registro en nombre de otro desde la oficina. Lo reporta un usuario
 * del sistema (`usuario_id`) o una persona externa (`nombre` y `contacto`). La foto va aparte, en multipart.
 */
export interface NuevaIncidencia {
  canal: CanalIncidencia
  tipo: string
  reportado_por: { usuario_id: number } | { nombre: string; contacto: string | null }
  espacio: string
  ejemplar: string | null
  descripcion: string
}
