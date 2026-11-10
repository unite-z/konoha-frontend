import { solicitarTercerizados } from './clienteTercerizados'
import type { AsignacionCapataz, CuartelInventario, ElementoInventario, NuevoTipoIntervencion, PersonaInventario, SectorInventario, TipoIntervencion } from '@/types/catalogosInventario'

const BASE = '/api/v1/inventario'

export function listarTiposIntervencion(incluirInactivos = false, signal?: AbortSignal): Promise<TipoIntervencion[]> {
  return solicitarTercerizados('tipos-intervencion/', { parametros: { incluir_inactivos: incluirInactivos }, signal, base: BASE })
}
export function crearTipoIntervencion(entrada: NuevoTipoIntervencion): Promise<TipoIntervencion> {
  return solicitarTercerizados('tipos-intervencion/', { metodo: 'POST', cuerpo: entrada, base: BASE })
}
export function cambiarTipoIntervencion(id: number, cambio: { activo: boolean }): Promise<TipoIntervencion> {
  return solicitarTercerizados(`tipos-intervencion/${id}/`, { metodo: 'PATCH', cuerpo: cambio, base: BASE })
}

export function listarTiposUso(incluirInactivos = false, signal?: AbortSignal): Promise<ElementoInventario[]> {
  return solicitarTercerizados('tipos-uso', { parametros: { incluir_inactivos: incluirInactivos }, signal, base: BASE })
}
export function crearTipoUso(nombre: string, color?: string): Promise<ElementoInventario> {
  return solicitarTercerizados('tipos-uso', { metodo: 'POST', cuerpo: { nombre, ...(color ? { color } : {}) }, base: BASE })
}
export function cambiarTipoUso(id: number, cambio: { activo?: boolean; color?: string; nombre?: string }): Promise<ElementoInventario> {
  return solicitarTercerizados(`tipos-uso/${id}`, { metodo: 'PATCH', cuerpo: cambio, base: BASE })
}
export function listarCuarteles(incluirDesaparecidos = false, signal?: AbortSignal): Promise<CuartelInventario[]> {
  return solicitarTercerizados('cuarteles', { parametros: { incluir_desaparecidos: incluirDesaparecidos }, signal, base: BASE })
}
export function crearCuartel(entrada: { numero: string; nombre: string }): Promise<CuartelInventario> {
  return solicitarTercerizados('cuarteles', { metodo: 'POST', cuerpo: entrada, base: BASE })
}
export function cambiarCuartel(id: number, estado: CuartelInventario['estado']): Promise<CuartelInventario> {
  return solicitarTercerizados(`cuarteles/${id}`, { metodo: 'PATCH', cuerpo: { estado }, base: BASE })
}
export function listarSectores(incluirInactivos = false, signal?: AbortSignal): Promise<SectorInventario[]> {
  return solicitarTercerizados('sectores', { parametros: { incluir_inactivos: incluirInactivos }, signal, base: BASE })
}
export function crearSector(entrada: { nombre: string; atencion_demanda: boolean }): Promise<SectorInventario> {
  return solicitarTercerizados('sectores', { metodo: 'POST', cuerpo: entrada, base: BASE })
}
export function cambiarSector(id: number, cambio: { activo: boolean }): Promise<SectorInventario> {
  return solicitarTercerizados(`sectores/${id}`, { metodo: 'PATCH', cuerpo: cambio, base: BASE })
}
export function asignarCapataz(sectorId: number, capatazId: number | null, fechaInicio?: string, motivo?: string): Promise<SectorInventario> {
  return solicitarTercerizados(`sectores/${sectorId}/capataz`, { metodo: 'PATCH', cuerpo: { capataz_id: capatazId, fecha_inicio: fechaInicio, motivo }, base: BASE })
}
export function listarCapataces(signal?: AbortSignal): Promise<PersonaInventario[]> {
  return solicitarTercerizados('capataces', { signal, base: BASE })
}
export function listarHistorialCapataz(sectorId: number): Promise<AsignacionCapataz[]> {
  return solicitarTercerizados(`sectores/${sectorId}/historial-capataz`, { base: BASE })
}
