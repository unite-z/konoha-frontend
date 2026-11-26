import type { SugerenciaCronograma } from '@/types/cronogramaIa'

/** Una propuesta entra si su periodo se cruza con el intervalo pedido (los extremos vacíos no limitan). */
export function enPeriodo(s: SugerenciaCronograma, desde: string, hasta: string): boolean {
  const { desde: inicio, hasta: fin } = s.contenido.entrada
  return (!desde || fin >= desde) && (!hasta || inicio <= hasta)
}
