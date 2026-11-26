import { PREFIJO_REDISENO } from '../prefijo'

/** Ruta antigua → su equivalente en el diseño nuevo. RD-05 (AV-425) completa la tabla; hasta entonces, solo el inicio. */
const REDIRECCIONES = new Map<string, string>([['/', PREFIJO_REDISENO]])

/** Destino en el diseño nuevo de una ruta antigua, o `null` si no tiene y se queda donde está. */
export function destinoRediseno(ruta: string): string | null {
  return REDIRECCIONES.get(ruta) ?? null
}
