/**
 * Servicios de RF-IA-001: extracción de informes de proveedores con IA.
 * Rutas relativas a API_BASE_URL (`backend/reportes_indicadores/api/urls.py`).
 */
import type { Paginado } from '../../types/comun'
import type { CuerpoValidacion, EstadoSugerencia, SugerenciaIA } from '../../types/ia'
import { solicitar } from './cliente'

export interface FiltrosExtracciones {
  estado?: EstadoSugerencia
  reporte_proveedor_id?: number
  /** Página de DRF (25 elementos por página). */
  page?: number
}

/** `GET ia/extracciones/`: lista paginada, de la más reciente a la más antigua. */
export function listarExtracciones(filtros: FiltrosExtracciones = {}, signal?: AbortSignal) {
  return solicitar<Paginado<SugerenciaIA>>('ia/extracciones/', { parametros: { ...filtros }, signal })
}

/** `POST ia/extracciones/`: solicita el análisis del informe de un reporte del proveedor (201). */
export function solicitarExtraccion(reporteProveedorId: number) {
  return solicitar<SugerenciaIA>('ia/extracciones/', {
    metodo: 'POST',
    cuerpo: { reporte_proveedor_id: reporteProveedorId },
  })
}

/** `GET ia/extracciones/{id}/`. */
export function obtenerExtraccion(id: number, signal?: AbortSignal) {
  return solicitar<SugerenciaIA>(`ia/extracciones/${id}/`, { signal })
}

/** `POST ia/extracciones/{id}/validar/`: decisión campo por campo. */
export function validarExtraccion(id: number, cuerpo: CuerpoValidacion) {
  return solicitar<SugerenciaIA>(`ia/extracciones/${id}/validar/`, { metodo: 'POST', cuerpo })
}

/** `POST ia/extracciones/{id}/rechazar/`: rechaza la propuesta completa. */
export function rechazarExtraccion(id: number, motivo: string | null) {
  return solicitar<SugerenciaIA>(`ia/extracciones/${id}/rechazar/`, {
    metodo: 'POST',
    cuerpo: { motivo: motivo || null },
  })
}
