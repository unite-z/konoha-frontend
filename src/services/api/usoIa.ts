/** Uso y costes de la IA (AV-396). Solo para quien tiene IA.PROPUESTA.VALIDAR. */
import type { UsoIa } from '@/types/ia'
import { solicitar } from './cliente'

/** `GET ia/uso/?desde=&hasta=` (fechas `AAAA-MM-DD`; sin ellas, el mes en curso). */
export function obtenerUsoIa(desde: string, hasta: string, signal?: AbortSignal) {
  return solicitar<UsoIa>('ia/uso/', { parametros: { desde, hasta }, signal })
}
