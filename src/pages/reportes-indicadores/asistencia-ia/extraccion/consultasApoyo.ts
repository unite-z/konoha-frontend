/**
 * Consultas de apoyo de RF-IA-001 a los servicios existentes (solo lectura): atenciones e informes de MOD-05
 * para identificar las propuestas, y propuestas ya creadas de cada informe para no duplicarlas.
 * Si MOD-05 no responde (sin permiso o sin conexión), la pantalla sigue con los números de siempre.
 */
import { listarExtracciones } from '../../../../services/api/ia'
import { listarReportes, obtenerAtencion } from '../../../../services/api/tercerizados'
import type { SugerenciaIA } from '../../../../types/ia'
import type { Atencion, DocumentoReporte, ReporteProveedor } from '../../../../types/tercerizados'

/** Atenciones de MOD-05 por id (las que fallan no se incluyen). */
export async function cargarAtenciones(ids: number[], signal: AbortSignal): Promise<Map<number, Atencion>> {
  const distintos = [...new Set(ids)]
  const resultados = await Promise.allSettled(distintos.map((id) => obtenerAtencion(id, signal)))
  const mapa = new Map<number, Atencion>()
  for (const r of resultados) if (r.status === 'fulfilled') mapa.set(r.value.id, r.value)
  return mapa
}

/** Todos los informes (revisiones) de una atención, del más reciente al más antiguo. */
export async function cargarReportes(atencionId: number, signal: AbortSignal): Promise<ReporteProveedor[]> {
  const reportes: ReporteProveedor[] = []
  for (let pagina = 1; pagina <= 20; pagina++) {
    const respuesta = await listarReportes(atencionId, pagina, signal)
    reportes.push(...respuesta.results)
    if (!respuesta.next) break
  }
  return reportes
}

/** Propuestas ya creadas de cada informe, por id de informe. */
export async function propuestasPorReporte(
  reporteIds: number[],
  signal: AbortSignal,
): Promise<Map<number, SugerenciaIA[]>> {
  const resultados = await Promise.allSettled(
    reporteIds.map((id) => listarExtracciones({ reporte_proveedor_id: id }, signal)),
  )
  const mapa = new Map<number, SugerenciaIA[]>()
  resultados.forEach((r, i) => {
    if (r.status === 'fulfilled') mapa.set(reporteIds[i], r.value.results)
  })
  return mapa
}

export interface InformeAnalizado {
  atencion: Atencion
  reporte: ReporteProveedor | null
  /** Documento del archivo analizado, para descargarlo. */
  documento: DocumentoReporte | null
}

/** Atención, informe y documento de una propuesta. */
export async function cargarInforme(
  atencionId: number,
  reporteId: number,
  archivoId: number,
  signal: AbortSignal,
): Promise<InformeAnalizado> {
  const atencion = await obtenerAtencion(atencionId, signal)
  let reporte: ReporteProveedor | null = null
  try {
    reporte = (await cargarReportes(atencionId, signal)).find((r) => r.id === reporteId) ?? null
  } catch {
    reporte = null // sin informes, la cabecera muestra la atención igualmente
  }
  const documento = reporte?.documentos.find((d) => d.archivo.id === archivoId) ?? null
  return { atencion, reporte, documento }
}

/** El informe incluye el documento «Informe final» (el que analiza la IA). */
export function tieneInformeFinal(reporte: ReporteProveedor): boolean {
  return reporte.documentos.some((d) => d.categoria === 'InformeFinal')
}
