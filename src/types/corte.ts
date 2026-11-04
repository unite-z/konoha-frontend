/**
 * Tipos del ciclo de corte de MOD-03 (RF-COR, AV-258 a AV-262). Reflejan el contrato previsto de
 * `GET planificacion/ciclos/{programacion}/`.
 */
import type { FechaIso } from './comun'
import type { Programacion, Restriccion } from './planificacion'

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

/** Una zona de la ruta de MOD-02 que se copia al programar el corte (AV-259); `en_ruta` falso si no es de esta ruta. */
export interface ZonaRuta {
  zona: string
  jardines: number
  en_ruta: boolean
}

/** `GET servicios/{id}/ruta/` (AV-259): la ruta propuesta y la marca «fuera de frecuencia» (CU-010 1a). */
export interface RutaCorte {
  zonas: ZonaRuta[]
  fuera_de_frecuencia: { dias_desde_ultimo: number; maximo_dias: number } | null
}

/**
 * `GET ruta-de-hoy/` (AV-260): el ciclo de corte en curso de la cuadrilla del capataz con su ruta; `ruta` es `null`
 * si hoy no hay corte.
 */
export interface RespuestaRutaDeHoy {
  ruta: RutaDeHoy | null
}

export interface RutaDeHoy {
  programacion_id: number
  /** «CC-2026-11» (AV-364). */
  codigo: string
  servicio: string
  jardines: JardinRuta[]
}

/**
 * Cuerpo de `POST ciclos/{programacion}/jardines/{jardin}/marca/` (AV-260), con `Idempotency-Key`. Un reenvío con la
 * misma clave responde 200 con la marca existente; si otro usuario ya lo marcó, 409 `ya-marcado`.
 */
export interface NuevaMarca {
  /** Hora real del toque (ISO), aunque se envíe después. */
  marcado_en: string
}

/**
 * `GET calendario-cuadrilla/?desde&hasta` (AV-254 y AV-252): calendario de solo lectura del capataz, con las
 * actividades de su cuadrilla y las restricciones del periodo.
 */
export interface CalendarioCuadrilla {
  /** «Cuadrilla B». */
  cuadrilla: string
  programaciones: Programacion[]
  restricciones: Restriccion[]
}

/** Un jardín del maestro de MOD-02 que no está en la ruta de hoy (`GET ruta-de-hoy/fuera-de-ruta/?q=`, AV-260). */
export interface JardinMaestro {
  id: number
  /** «J-061». */
  codigo: string
  nombre: string
  zona: string
}

/**
 * Cuerpo de `POST ciclos/{programacion}/fuera-de-ruta/` (AV-260, CU-011 2b), con `Idempotency-Key`: el capataz cortó
 * un jardín que no está en la ruta; queda pendiente de que el jefe de sección lo incorpore.
 */
export interface NuevaMarcaFueraDeRuta {
  jardin_id: number
  marcado_en: string
  nota: string
}
