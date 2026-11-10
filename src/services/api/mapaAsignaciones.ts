import { solicitarTercerizados } from './clienteTercerizados'
import type { PoligonoMapaAsignado, UsoFuenteMapa } from '@/types/mapaInventario'
import type { EjemplarInventario } from '@/types/ejemplares'
import type { AreaVerde, PaginaAreasVerdes } from '@/types/areasVerdes'

const BASE = '/api/v1/inventario'

export function listarUsosFuenteMapa(signal?: AbortSignal): Promise<UsoFuenteMapa[]> {
  return solicitarTercerizados('mapa/usos-fuente', { signal, base: BASE })
}
export function clasificarUsoFuenteMapa(uso_fuente: string, tipo_uso_id: number | null): Promise<UsoFuenteMapa> {
  return solicitarTercerizados('mapa/usos-fuente', { metodo: 'PUT', cuerpo: { uso_fuente, tipo_uso_id }, base: BASE })
}
export function listarPoligonosMapa(signal?: AbortSignal): Promise<PoligonoMapaAsignado[]> {
  return solicitarTercerizados('mapa/poligonos', { signal, base: BASE })
}
export interface ImpactoPoligono {
  area_anterior_id: number | null
  reasignables: { id: number; codigo: string }[]
  conflictos: { id: number; codigo: string }[]
}

export interface UbicacionEnMapa {
  areas: { id: number; nombre: string }[]
  estado: 'pendiente' | 'dentro' | 'fuera'
}

export function consultarUbicacionEnMapa(latitud: number, longitud: number, area_verde_id: number | null, signal?: AbortSignal): Promise<UbicacionEnMapa> {
  return solicitarTercerizados('mapa/ubicacion', { parametros: { latitud, longitud, area_verde_id: area_verde_id ?? undefined }, signal, base: BASE })
}

export function listarEjemplaresDePoligono(id: string, signal?: AbortSignal): Promise<EjemplarInventario[]> {
  return solicitarTercerizados(`mapa/poligonos/${id}/ejemplares`, { signal, base: BASE })
}

export function revisarImpactoPoligono(id: string, area_verde_id: number | null): Promise<ImpactoPoligono> {
  return solicitarTercerizados(`mapa/poligonos/${id}/impacto`, { parametros: { area_verde_id: area_verde_id ?? undefined }, base: BASE })
}

export function asignarPoligonoMapa(id_fuente: string, area_verde_id: number | null, impacto?: ImpactoPoligono): Promise<PoligonoMapaAsignado> {
  const confirmacion = impacto && {
    area_anterior_id: impacto.area_anterior_id,
    ejemplares_ids: impacto.reasignables.map((ejemplar) => ejemplar.id),
  }
  return solicitarTercerizados(`mapa/poligonos/${id_fuente}`, { metodo: 'PUT', cuerpo: { area_verde_id, confirmacion }, base: BASE })
}
export async function listarTodasLasAreasVerdes(signal?: AbortSignal): Promise<AreaVerde[]> {
  const areas: AreaVerde[] = []
  let page = 1
  while (true) {
    const resultado = await solicitarTercerizados<PaginaAreasVerdes>('areas-verdes/', { parametros: { page }, signal, base: BASE })
    areas.push(...resultado.results)
    if (resultado.next === null) return areas
    page = resultado.next
  }
}
