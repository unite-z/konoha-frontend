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

/** Capataz al que se puede reasignar una incidencia (`GET incidencias/{id}/capataces/`, AV-280). */
export interface CapatazDisponible {
  id: number
  nombre: string
  cuadrilla: string
}
