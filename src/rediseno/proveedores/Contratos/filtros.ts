import type { FiltrosContratos } from '@/services/api/maestrosTercerizados'

export const POR_PAGINA = 25

export type Vigencia = 'vigente' | 'vencido' | ''

export interface FiltrosUrl {
  q: string
  vigencia: Vigencia
  pagina: number
}

/** Lee los filtros de la URL; lo inválido (página no numérica, vigencia desconocida) se ignora. */
export function filtrosDeUrl(parametros: URLSearchParams): FiltrosUrl {
  const vigencia = parametros.get('vigencia')
  const pagina = Number(parametros.get('pagina'))
  return {
    q: (parametros.get('q') ?? '').trim().slice(0, 100),
    vigencia: vigencia === 'vigente' || vigencia === 'vencido' ? vigencia : '',
    pagina: Number.isInteger(pagina) && pagina > 1 ? pagina : 1,
  }
}

/** Parámetros de la API para esos filtros. */
export function filtrosDeApi(f: FiltrosUrl): FiltrosContratos {
  return {
    q: f.q || undefined,
    vigente: f.vigencia === '' ? undefined : f.vigencia === 'vigente',
  }
}

/** Copia de la URL con los cambios aplicados (`null` quita el parámetro); conserva el resto, como el panel abierto. */
export function conCambios(parametros: URLSearchParams, cambios: Record<string, string | null>): URLSearchParams {
  const nuevos = new URLSearchParams(parametros)
  for (const [clave, valor] of Object.entries(cambios)) {
    if (valor === null || valor === '') nuevos.delete(clave)
    else nuevos.set(clave, valor)
  }
  return nuevos
}
