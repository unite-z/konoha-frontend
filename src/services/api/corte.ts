/**
 * Servicios del ciclo de corte de MOD-03 (AV-258 a AV-262). Base: `/api/v1/planificacion/ciclos/`.
 * El backend aún no existe: con `VITE_DATOS_SIMULADOS=true` responden los datos simulados (D9).
 */
import { DATOS_SIMULADOS } from '@/config/datosSimulados'
import type { CicloCorte } from '@/types/corte'
import type { Programacion } from '@/types/planificacion'
import { solicitarPlanificacion } from './clientePlanificacion'

/** `GET ciclos/{programacion}/`: ruta con las marcas, interrupciones y limpiezas del corte. */
export async function obtenerCicloCorte(ciclo: Programacion, signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularObtenerCicloCorte } = await import('../simulados/corte')
    return simularObtenerCicloCorte(ciclo, signal)
  }
  return solicitarPlanificacion<CicloCorte>(`ciclos/${ciclo.id}/`, { signal })
}
