/** Contrato de `GET resumen-sectores/` (AV-433): avance del ciclo por sector y servicio periódico. Claves en snake_case. */
import type { FechaIso, InstanteIso } from './comun'

export type ServicioSector = 'corte' | 'riego' | 'poda'

export interface AvanceServicioSector {
  servicio: ServicioSector
  programado: number
  ejecutado: number
  /** Un decimal; 0 si no hay nada programado. */
  porcentaje: number
  /** Última modificación del ciclo o marca de corte; `null` si no hay datos. */
  actualizado_en: InstanteIso | null
}

export interface AvanceSector {
  sector_id: number
  sector: string
  servicios: AvanceServicioSector[]
}

export interface ResumenSectores {
  ciclo_id: number | null
  desde: FechaIso | null
  hasta: FechaIso | null
  generado_en: InstanteIso
  sectores: AvanceSector[]
}
