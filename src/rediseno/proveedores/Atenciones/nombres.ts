import { fila } from '@/rediseno/base/movimiento'

/**
 * Nombre de transición de la fila de una atención. Lleva prefijo porque un contrato con el mismo id comparte página
 * (las atenciones recientes y la lista de contratos); la ficha (RD-53) usa este mismo nombre en su cabecera.
 */
export function nombreFilaAtencion(id: number): string {
  return fila(`atencion-${id}`)
}
