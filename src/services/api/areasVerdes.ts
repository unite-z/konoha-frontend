import { solicitarTercerizados } from './clienteTercerizados'
import type { AreaVerde, PaginaAreasVerdes } from '@/types/areasVerdes'

const BASE = '/api/v1/inventario'

export function listarAreasVerdes(q = '', signal?: AbortSignal): Promise<PaginaAreasVerdes> {
  return solicitarTercerizados<PaginaAreasVerdes>('areas-verdes/', {
    parametros: { q },
    signal,
    base: BASE,
  })
}

export function registrarAreaVerde(
  entrada: { nombre: string; lugar: string; ubicacion: string; superficie_m2: string; tipo_cobertura_id: number | null },
  signal?: AbortSignal,
): Promise<AreaVerde> {
  return solicitarTercerizados<AreaVerde>('areas-verdes/', {
    metodo: 'POST',
    cuerpo: entrada,
    signal,
    base: BASE,
  })
}
