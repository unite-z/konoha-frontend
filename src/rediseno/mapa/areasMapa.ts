import { listarAreasVerdes } from '@/services/api/areasVerdes'
import type { AreaVerde } from '@/types/areasVerdes'
import { PARAMETROS_MAPA } from './enlaces'

/** Búsqueda y filtros de Mapa tal como viajan en la URL (cadena vacía = sin filtrar). */
export interface FiltrosMapa {
  q: string
  sector: string
  uso: string
  cuartel: string
}

export const SIN_FILTROS: FiltrosMapa = {
  q: '',
  sector: '',
  uso: '',
  cuartel: '',
}

export const AREAS_POR_PAGINA = 10

export function filtrosDeUrl(parametros: URLSearchParams): FiltrosMapa {
  return {
    q: parametros.get(PARAMETROS_MAPA.busqueda)?.trim() ?? '',
    sector: parametros.get(PARAMETROS_MAPA.sector) ?? '',
    uso: parametros.get(PARAMETROS_MAPA.uso) ?? '',
    cuartel: parametros.get(PARAMETROS_MAPA.cuartel) ?? '',
  }
}

export function hayFiltros(filtros: FiltrosMapa): boolean {
  return Object.values(filtros).some((valor) => valor !== '')
}

export function clavesDeFiltros(filtros: FiltrosMapa): string {
  return [filtros.q, filtros.sector, filtros.uso, filtros.cuartel].join('|')
}

const numero = (valor: string) => (valor === '' ? undefined : Number(valor))

/** Todo el resultado de la búsqueda y los filtros: el mapa lo pinta entero y la lista lo pagina. */
export async function listarAreasDelMapa(filtros: FiltrosMapa, signal?: AbortSignal): Promise<AreaVerde[]> {
  const areas: AreaVerde[] = []
  let pagina: number | null = 1
  while (pagina !== null) {
    const resultado = await listarAreasVerdes(filtros.q, signal, {
      sector_id: numero(filtros.sector),
      tipo_uso_id: numero(filtros.uso),
      cuartel_id: numero(filtros.cuartel),
      page: pagina,
    })
    areas.push(...resultado.results)
    pagina = resultado.next
  }
  return areas
}
