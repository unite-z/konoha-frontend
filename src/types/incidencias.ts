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
