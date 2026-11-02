import { solicitarTercerizados } from './clienteTercerizados'

export interface CoberturaVegetal {
  id: number
  nombre: string
  activo: boolean
}

const BASE_INVENTARIO = '/api/v1/inventario'

export function listarCoberturas(incluirInactivas = true, signal?: AbortSignal): Promise<CoberturaVegetal[]> {
  return solicitarTercerizados<CoberturaVegetal[]>('coberturas/', {
    parametros: { incluir_inactivas: incluirInactivas },
    signal,
    base: BASE_INVENTARIO,
  })
}

export function crearCobertura(nombre: string, signal?: AbortSignal): Promise<CoberturaVegetal> {
  return solicitarTercerizados<CoberturaVegetal>('coberturas/', {
    metodo: 'POST',
    cuerpo: { nombre },
    signal,
    base: BASE_INVENTARIO,
  })
}

export function modificarCobertura(
  id: number,
  cambio: { nombre?: string; activo?: boolean },
  signal?: AbortSignal,
): Promise<CoberturaVegetal> {
  return solicitarTercerizados<CoberturaVegetal>(`coberturas/${id}/`, {
    metodo: 'PATCH',
    cuerpo: cambio,
    signal,
    base: BASE_INVENTARIO,
  })
}
