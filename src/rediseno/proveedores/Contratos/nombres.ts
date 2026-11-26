import { fila } from '@/rediseno/base/movimiento'

/** Nombre de la transición de la cifra de avance de la fila al panel. */
export function nombreAvance(id: number | string): string {
  return `${fila(id)}-avance`
}
