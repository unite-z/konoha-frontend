import { solicitarTercerizados } from './clienteTercerizados'
import type { EjemplarInventario, EspecieVegetal } from '@/types/ejemplares'

const BASE = '/api/v1/inventario'

export function listarEjemplares(q = '', page = 1, signal?: AbortSignal): Promise<EjemplarInventario[]> {
  return solicitarTercerizados('ejemplares', { parametros: { q, page }, signal, base: BASE })
}
export function crearEjemplar(entrada: {
  codigo_placa_antigua?: string | null; especie_id?: number | null; tipo_vegetacion?: string | null
  ubicacion?: string | null; latitud?: string | null; longitud?: string | null; cantidad?: number
}): Promise<EjemplarInventario> {
  return solicitarTercerizados('ejemplares', { metodo: 'POST', cuerpo: entrada, base: BASE })
}
export function quitarPlacaAntigua(id: number): Promise<EjemplarInventario> {
  return solicitarTercerizados(`ejemplares/${id}/placa-antigua`, { metodo: 'DELETE', base: BASE })
}
export function listarEspecies(incluirInactivas = false, signal?: AbortSignal): Promise<EspecieVegetal[]> {
  return solicitarTercerizados('especies', { parametros: { incluir_inactivas: incluirInactivas }, signal, base: BASE })
}
export function crearEspecie(entrada: {
  nombre_comun: string; nombre_cientifico?: string; forma_biologica: string
}): Promise<EspecieVegetal> {
  return solicitarTercerizados('especies', { metodo: 'POST', cuerpo: entrada, base: BASE })
}
export function cambiarEspecie(id: number, cambio: { activo?: boolean }): Promise<EspecieVegetal> {
  return solicitarTercerizados(`especies/${id}`, { metodo: 'PATCH', cuerpo: cambio, base: BASE })
}
