/**
 * Asociación de un informe subido con su atención (RD-56): «coincide» si la atención existe y espera informe;
 * «por revisar» si no existe o ya no lo espera (otro estado). Lógica pura.
 */
import type { Atencion } from '@/types/tercerizados'

export type Asociacion = 'coincide' | 'por-revisar'

/** Estados en los que la atención admite un informe nuevo: primera entrega o subsanación de una observación. */
export const ESTADOS_ESPERA_INFORME: readonly string[] = ['Ejecutado pendiente de reporte', 'Observado']

/** Estados anteriores al fin del servicio: aún no hay informe que analizar. */
const ESTADOS_SIN_INFORME: readonly string[] = [
  'Requerimiento registrado',
  'OC referenciada',
  'En ejecución',
  'Ejecutado pendiente de reporte',
]

export function asociar(atencion: Pick<Atencion, 'estado'> | null): Asociacion {
  return atencion !== null && ESTADOS_ESPERA_INFORME.includes(atencion.estado) ? 'coincide' : 'por-revisar'
}

/** Por qué un informe queda «por revisar», para la persona. */
export function motivoPorRevisar(atencion: Pick<Atencion, 'estado' | 'codigo'> | null, atencionId: number): string {
  if (atencion === null) return `La atención n.º ${atencionId} no existe o no se puede consultar.`
  return `La atención ${atencion.codigo} está «${atencion.estado}» y no espera un informe nuevo.`
}

/** La atención ya tiene al menos un informe del proveedor que se puede analizar. */
export function tieneInformeAdjunto(atencion: Pick<Atencion, 'estado'>): boolean {
  return !ESTADOS_SIN_INFORME.includes(atencion.estado)
}
