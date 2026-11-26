/** Avance del ciclo por sector y servicio de MOD-03 (AV-433). Las pantallas no llaman a `fetch`: usan esta función. */
import type { FechaIso } from '@/types/comun'
import type { ResumenSectores } from '@/types/resumenSectores'
import { solicitarPlanificacion } from './clientePlanificacion'

export interface FiltroResumenSectores {
  /** Solo ese ciclo; 404 `ciclo-no-encontrado` si no existe. */
  cicloId?: number
  /** Ciclos que se solapan con el periodo; 400 `periodo-invalido` si `hasta < desde`. */
  desde?: FechaIso
  hasta?: FechaIso
}

/** `GET resumen-sectores/?ciclo_id=&desde=&hasta=`: todos los sectores activos con corte, riego y poda. */
export function obtenerResumenSectores(filtro: FiltroResumenSectores, signal?: AbortSignal) {
  return solicitarPlanificacion<ResumenSectores>('resumen-sectores/', {
    parametros: { ciclo_id: filtro.cicloId ?? null, desde: filtro.desde ?? null, hasta: filtro.hasta ?? null },
    signal,
  })
}
