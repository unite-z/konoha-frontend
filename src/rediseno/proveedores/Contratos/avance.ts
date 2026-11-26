import type { ContratoMaestro } from '@/types/maestrosTercerizados'
import type { Atencion } from '@/types/tercerizados'

/** El listado y la ficha del contrato traen estos campos desde RD-16 (AV-435); antes no existen. */
export type ContratoConAvance = ContratoMaestro & {
  atenciones_conformes?: number
  atenciones_observadas?: number
  atenciones_pendientes?: number
}

export interface Avance {
  total: number
  conformes: number
  observadas: number
  /** En espera de la conformidad del jefe («Reporte adjunto»). */
  pendientes: number
}

/** Avance que ya trae el contrato (RD-16), o `null` si el backend aún no lo envía. */
export function avanceDelContrato(contrato: ContratoConAvance): Avance | null {
  const {
    atenciones_conformes: conformes,
    atenciones_observadas: observadas,
    atenciones_pendientes: pendientes,
  } = contrato
  if (conformes === undefined || observadas === undefined || pendientes === undefined) return null
  return { total: contrato.atenciones, conformes, observadas, pendientes }
}

/** Sin RD-16, el avance se calcula al abrir el contrato con sus atenciones. */
export function avanceDeAtenciones(atenciones: readonly Pick<Atencion, 'estado'>[]): Avance {
  const contar = (estado: Atencion['estado']) => atenciones.filter((a) => a.estado === estado).length
  return {
    total: atenciones.length,
    conformes: contar('Conforme / cerrado'),
    observadas: contar('Observado'),
    pendientes: contar('Reporte adjunto'),
  }
}

/** Atenciones aún sin informe: ni conformes, ni observadas, ni pendientes de verificar. */
export function enCurso(avance: Avance): number {
  return Math.max(0, avance.total - avance.conformes - avance.observadas - avance.pendientes)
}
