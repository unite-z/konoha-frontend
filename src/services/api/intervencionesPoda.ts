import { solicitarTercerizados } from './clienteTercerizados'
import type {
  CambioIntervencionPoda,
  CatalogosRegistroPoda,
  ContratoPodaAltura,
  EjemplarPodaAltura,
  IntervencionPoda,
  NuevaIntervencionPoda,
  NuevaPodaAltura,
  OpcionCatalogoPoda,
} from '@/types/intervencionesPoda'

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
export function cambiarIntervencion(id: number, cambio: CambioIntervencionPoda): Promise<IntervencionPoda> {
  return solicitarTercerizados(`${RUTA}${id}/`, { metodo: 'PATCH', cuerpo: cambio, base: BASE })
}

// --- Poda de altura a demanda (AV-312) ---
const ALTURA = 'podas-altura/'

export function solicitarPodaAltura(entrada: NuevaPodaAltura): Promise<IntervencionPoda> {
  return solicitarTercerizados(ALTURA, { metodo: 'POST', cuerpo: entrada, base: BASE })
}
export function listarContratosPodaAltura(signal?: AbortSignal): Promise<ContratoPodaAltura[]> {
  return solicitarTercerizados(`${ALTURA}contratos/`, { signal, base: BASE })
}
export function consultarEjemplarPodaAltura(id: number, signal?: AbortSignal): Promise<EjemplarPodaAltura> {
  return solicitarTercerizados(`${ALTURA}ejemplares/${id}/`, { signal, base: BASE })
}
