/** Filtros en la URL de las listas de proveedores, contratos y atención especial. */

export type ClaveFiltroMaestros = 'pestana' | 'q' | 'estado' | 'vinculo' | 'vigencia' | 'plaga' | 'pagina'

export const FILTROS_MAESTROS_VACIOS: Record<ClaveFiltroMaestros, string> = {
  pestana: 'proveedores',
  q: '',
  estado: '',
  vinculo: '',
  vigencia: '',
  plaga: '',
  pagina: '',
}

export type FiltrosMaestros = Record<ClaveFiltroMaestros, string>

export type EstablecerFiltros = (cambios: Partial<Record<ClaveFiltroMaestros, string | null>>) => void

/** Número de página de la URL: entero positivo; cualquier otra cosa es la primera. */
export function paginaDe(texto: string): number {
  const numero = Number(texto)
  return Number.isInteger(numero) && numero > 1 ? numero : 1
}

/** Tamaño de página de la API. */
export const POR_PAGINA = 25

/** Estado que recibe una lista tras registrar algo (aviso de confirmación). */
export interface EstadoNavegacionMaestros {
  aviso: string
}

export function avisoDeNavegacion(estado: unknown): string | null {
  const aviso = (estado as { aviso?: unknown } | null)?.aviso
  return typeof aviso === 'string' ? aviso : null
}
