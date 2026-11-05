import { solicitarTercerizados } from './clienteTercerizados'
import type { CatalogosRegistroPoda, IntervencionPoda, NuevaIntervencionPoda, OpcionCatalogoPoda } from '@/types/intervencionesPoda'

const BASE = '/api/v1/inventario'
const RUTA = 'intervenciones-poda/'

export function consultarCatalogosPoda(signal?: AbortSignal): Promise<CatalogosRegistroPoda> {
  return solicitarTercerizados(`${RUTA}catalogos/`, { signal, base: BASE })
}
export function listarIncidenciasEjemplar(ejemplarId: number, signal?: AbortSignal): Promise<OpcionCatalogoPoda[]> {
  return solicitarTercerizados(`${RUTA}incidencias/`, { parametros: { ejemplar_id: ejemplarId }, signal, base: BASE })
}
export function obtenerIntervencion(id: number, signal?: AbortSignal): Promise<IntervencionPoda> {
  return solicitarTercerizados(`${RUTA}${id}/`, { signal, base: BASE })
}
export function crearIntervencion(entrada: NuevaIntervencionPoda): Promise<IntervencionPoda> {
  return solicitarTercerizados(RUTA, { metodo: 'POST', cuerpo: entrada, base: BASE })
}
export function anularIntervencion(id: number): Promise<void> {
  return solicitarTercerizados(`${RUTA}${id}/`, { metodo: 'DELETE', base: BASE })
}
