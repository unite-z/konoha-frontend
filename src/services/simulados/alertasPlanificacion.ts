/**
 * Alertas de planificación de MOD-03 con el contrato de AV-255, solo con `VITE_DATOS_SIMULADOS=true`: el backend
 * aún no guarda las alertas con id ni tiene `POST alertas/{id}/motivo/`. Las alertas reales de `GET alertas/`
 * reciben un id estable (el de su ciclo o, si no tiene, el de su servicio) y el motivo se responde sin guardarse.
 */
import type { AlertaAtendida, AlertaPlanificacion } from '@/types/planificacion'
import { responderSimulado } from './simulacion'

/** Id estable de la alerta: el ciclo si lo tiene; si no, el servicio, desplazado para no chocar. */
export function simularIdsAlertas(alertas: AlertaPlanificacion[]): AlertaPlanificacion[] {
  return alertas.map((alerta) => (alerta.id !== undefined ? alerta : { ...alerta, id: alerta.programacion_id ?? 100_000 + alerta.servicio_id }))
}

export function simularRegistrarMotivo(id: number, motivo: string): Promise<AlertaAtendida> {
  return responderSimulado(() => ({ id, estado: 'Atendida' as const, motivo, atendida_por: 'Usuario de prueba', fecha_atencion: new Date().toISOString() }))
}
