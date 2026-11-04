/**
 * Tipos del ciclo de corte de MOD-03 (RF-COR, AV-258 a AV-262). Reflejan el contrato previsto de
 * `GET planificacion/ciclos/{programacion}/`; hasta que exista, responde `services/simulados/corte.ts` (D9).
 */
import type { FechaIso } from './comun'

export type EstadoJardin = 'Pendiente' | 'Cortado'

/** Un jardín de la ruta copiada de MOD-02 al programar el corte (AV-259) y su marca (AV-260). */
export interface JardinRuta {
  id: number
  /** «J-014». */
  codigo: string
  nombre: string
  zona: string
  estado: EstadoJardin
  /** Hora real de la marca (ISO), aunque llegue después por la cola sin conexión. */
  marcado_en: string | null
  marcado_por: string | null
  /** Pendiente porque una interrupción detuvo el corte en su zona (AV-258). */
  detenido_por_interrupcion: boolean
}

/** Interrupción por molestia con traslado a otra zona (AV-258, HU-009). */
export interface InterrupcionCorte {
  id: number
  zona_afectada: string
  zona_alternativa: string | null
  /** Hora de la interrupción (ISO). */
  hora: string
  motivo: string
  minutos_descontados: number
  aviso_proveedor: boolean
  registrada_como_restriccion: boolean
}

/** Jornada de limpieza (AV-262), solo con la ruta completa. */
export interface LimpiezaCorte {
  id: number
  fecha: FechaIso
  autor: string
}

export interface CicloCorte {
  programacion_id: number
  jardines: JardinRuta[]
  interrupciones: InterrupcionCorte[]
  limpiezas: LimpiezaCorte[]
  /** Días de interrupción que no cuentan en la duración (0,5 = media jornada). */
  dias_interrupcion_descontados: number
}

/** Zona alternativa pendiente de la ruta para trasladar el corte (AV-258), con su aviso del día si lo hay. */
export interface ZonaAlternativa {
  zona: string
  pendientes: number
  /** «Reserva de jardín»: restricción de aviso de hoy en la zona; `null` si no hay. */
  aviso_hoy: string | null
}

/** Cuerpo de `POST programaciones/{id}/interrupciones/` (AV-258, solo jefe). */
export interface NuevaInterrupcion {
  zona_afectada: string
  zona_alternativa: string
  /** Hora de la interrupción (ISO). */
  hora: string
  motivo: string
  aviso_proveedor: boolean
  registrar_restriccion: boolean
}
