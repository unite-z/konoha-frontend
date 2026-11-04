/**
 * Servicios del ciclo de corte de MOD-03 (AV-258 a AV-262). Base: `/api/v1/planificacion/ciclos/`.
 * El backend aún no existe: con `VITE_DATOS_SIMULADOS=true` responden los datos simulados (D9).
 */
import { DATOS_SIMULADOS } from '@/config/datosSimulados'
import type { FechaIso } from '@/types/comun'
import type { CicloCorte, LimpiezaCorte } from '@/types/corte'
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

/** `POST ciclos/{programacion}/limpiezas/` (AV-262): registra una jornada de limpieza; 409 si la ruta no está completa. */
export async function registrarLimpieza(programacionId: number, fecha: FechaIso) {
  if (DATOS_SIMULADOS) {
    const { simularRegistrarLimpieza } = await import('../simulados/corte')
    return simularRegistrarLimpieza(fecha)
  }
  return solicitarPlanificacion<LimpiezaCorte>(`ciclos/${programacionId}/limpiezas/`, { metodo: 'POST', cuerpo: { fecha } })
}
