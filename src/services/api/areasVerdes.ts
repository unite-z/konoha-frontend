import { solicitarTercerizados } from './clienteTercerizados'
import type { AreaVerde, PaginaAreasVerdes } from '@/types/areasVerdes'

const BASE = '/api/v1/inventario'

export interface FiltrosAreasVerdes {
  sector_id?: number
  cuartel_id?: number
  tipo_uso_id?: number
}

export function listarAreasVerdes(q = '', signal?: AbortSignal, filtros: FiltrosAreasVerdes = {}): Promise<PaginaAreasVerdes> {
  return solicitarTercerizados<PaginaAreasVerdes>('areas-verdes/', {
    parametros: { q, ...filtros },
    signal,
    base: BASE,
  })
}

export function obtenerAreaVerde(areaId: number, signal?: AbortSignal): Promise<AreaVerde> {
  return solicitarTercerizados<AreaVerde>(`areas-verdes/${areaId}`, { signal, base: BASE })
}

export function registrarAreaVerde(
  entrada: {
    nombre: string
    lugar: string
    ubicacion: string
    superficie_m2: string
    tipo_cobertura_id: number | null
    tipo_uso_id: number | null
    cuartel_id: number | null
    sector_id: number | null
    poligono_mapa_id?: string
  },
  signal?: AbortSignal,
): Promise<AreaVerde> {
  return solicitarTercerizados<AreaVerde>('areas-verdes/', {
    metodo: 'POST',
    cuerpo: entrada,
    signal,
    base: BASE,
  })
}

export interface CambioAreaVerde {
  nombre?: string
  lugar?: string
  ubicacion?: string
  superficie_m2?: string
  activo?: boolean
  tipo_cobertura_id?: number
  tipo_uso_id?: number
  cuartel_id?: number
}

export function modificarAreaVerde(areaId: number, cambio: CambioAreaVerde, signal?: AbortSignal): Promise<AreaVerde> {
  return solicitarTercerizados<AreaVerde>(`areas-verdes/${areaId}`, {
    metodo: 'PATCH',
    cuerpo: cambio,
    signal,
    base: BASE,
  })
}

export interface HistorialSectorArea {
  id: number
  sector_id: number
  sector_nombre: string
  fecha_inicio: string
  fecha_fin: string | null
}

export function asignarSectorArea(areaId: number, sectorId: number | null, signal?: AbortSignal): Promise<AreaVerde> {
  return solicitarTercerizados<AreaVerde>(`areas-verdes/${areaId}/sector`, {
    metodo: 'PATCH',
    cuerpo: { sector_id: sectorId },
    signal,
    base: BASE,
  })
}

export function listarHistorialSectorArea(areaId: number, signal?: AbortSignal): Promise<HistorialSectorArea[]> {
  return solicitarTercerizados<HistorialSectorArea[]>(`areas-verdes/${areaId}/historial-sector`, {
    signal,
    base: BASE,
  })
}
