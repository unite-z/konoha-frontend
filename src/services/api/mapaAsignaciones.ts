import { solicitarTercerizados } from './clienteTercerizados'
import type { PoligonoMapaAsignado, UsoFuenteMapa } from '../../types/mapaInventario'
import type { AreaVerde, PaginaAreasVerdes } from '../../types/areasVerdes'

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
export function asignarPoligonoMapa(id_fuente: string, area_verde_id: number | null): Promise<PoligonoMapaAsignado> {
  return solicitarTercerizados(`mapa/poligonos/${id_fuente}`, { metodo: 'PUT', cuerpo: { area_verde_id }, base: BASE })
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
