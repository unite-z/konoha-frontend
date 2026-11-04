/**
 * Servicios de RF-REP-009: exportación de reportes del MOD-06 (`ReporteGenerado`, Modelo BD 4.6.2).
 * Rutas relativas a `API_REPORTES_GESTION_URL`. Solo `POST exportaciones/` crea algo (el registro del archivo);
 * la información original no cambia.
 *
 * SUPUESTO (pendiente de confirmar con el backend): recurso único `exportaciones/` con `tipos/`, el historial
 * paginado (25) y `{id}/archivo/`; errores 422 `volumen-excedido` y `sin-datos`.
 */
import { DATOS_SIMULADOS } from '@/config/datosSimulados'
import type { Paginado } from '@/types/comun'
import type { ConsultaExportaciones, ReporteGenerado, SolicitudExportacion, TipoExportable } from '@/types/exportaciones'
import { descargarReportesGestion, solicitarReportesGestion } from './clienteReportesGestion'

/** `GET exportaciones/tipos/`: tipos exportables con sus formatos y filtros. */
export async function listarTiposExportables(signal?: AbortSignal): Promise<TipoExportable[]> {
  if (DATOS_SIMULADOS) {
    const { simularTiposExportables } = await import('../simulados/exportaciones')
    return simularTiposExportables(signal)
  }
  return solicitarReportesGestion<TipoExportable[]>('exportaciones/tipos/', { signal })
}

/** `POST exportaciones/`: genera el archivo (201 con el `ReporteGenerado`). */
export async function generarExportacion(solicitud: SolicitudExportacion, signal?: AbortSignal): Promise<ReporteGenerado> {
  if (DATOS_SIMULADOS) {
    const { simularGenerarExportacion } = await import('../simulados/exportaciones')
    return simularGenerarExportacion(solicitud, signal)
  }
  return solicitarReportesGestion<ReporteGenerado>('exportaciones/', { metodo: 'POST', cuerpo: solicitud, signal })
}

/** `GET exportaciones/?page=&tipo=`: historial, del más reciente al más antiguo. */
export async function listarExportaciones(consulta: ConsultaExportaciones, signal?: AbortSignal): Promise<Paginado<ReporteGenerado>> {
  if (DATOS_SIMULADOS) {
    const { simularListarExportaciones } = await import('../simulados/exportaciones')
    return simularListarExportaciones(consulta, signal)
  }
  return solicitarReportesGestion<Paginado<ReporteGenerado>>('exportaciones/', { parametros: { ...consulta }, signal })
}

/** `GET exportaciones/{id}/archivo/`: descarga el archivo. Con datos simulados, un CSV de ejemplo. */
export async function descargarExportacion(reporte: ReporteGenerado, signal?: AbortSignal): Promise<void> {
  if (DATOS_SIMULADOS) {
    const { simularDescargaExportacion } = await import('../simulados/exportaciones')
    return simularDescargaExportacion(reporte, signal)
  }
  return descargarReportesGestion(`exportaciones/${reporte.id}/archivo/`, reporte.archivo?.nombre ?? `reporte-${reporte.id}`, signal)
}
