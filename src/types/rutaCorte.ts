/** Contrato de la ruta de jardines del corte de césped (AV-129, RF-INV-004). Claves en snake_case, como la API. */
import type { FechaIso, InstanteIso } from './comun'

export interface RetiroRutaCorte {
  id: number
  area_verde_id: number
  area_verde_nombre: string
  /** Se aplica a los ciclos que empiezan este día o después. */
  desde: FechaIso
  motivo: string
  autor: string
  fecha_registro: InstanteIso
  reincorporado_desde: FechaIso | null
  motivo_reincorporacion: string | null
  autor_reincorporacion: string | null
}

export interface JardinRutaCorte {
  area_verde_id: number
  nombre: string
  sector: string
  /** Sector de atención a demanda: fuera de la ruta ordinaria. */
  a_demanda: boolean
  /** Texto decimal. */
  superficie_m2: string
  /** Se corta en los ciclos que empiezan en la fecha consultada. */
  en_ruta: boolean
  /** Retiro abierto, aunque empiece más adelante. */
  retiro: RetiroRutaCorte | null
}

export interface RutaCorte {
  fecha: FechaIso
  total_jardines: number
  /** Texto decimal. */
  superficie_total_m2: string
  jardines: JardinRutaCorte[]
}

export interface NuevoRetiroRutaCorte {
  area_verde_id: number
  desde: FechaIso
  motivo: string
}

export interface ReincorporacionRutaCorte {
  desde: FechaIso
  motivo: string
}
