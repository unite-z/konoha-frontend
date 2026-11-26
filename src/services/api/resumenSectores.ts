/** Avance del ciclo por sector y servicio de MOD-03 (AV-433). Las pantallas no llaman a `fetch`: usan esta función. */
import type { ResumenSectores } from '@/types/resumenSectores'
import { solicitarPlanificacion } from './clientePlanificacion'

/** `GET resumen-sectores/?ciclo_id=`: todos los sectores activos con corte, riego y poda. 404 `ciclo-no-encontrado` si el ciclo no existe. */
export function obtenerResumenSectores(cicloId: number | null, signal?: AbortSignal) {
  return solicitarPlanificacion<ResumenSectores>('resumen-sectores/', { parametros: { ciclo_id: cicloId }, signal })
}
