/**
 * Informes de una atención de MOD-05 para elegir cuál analizar (RF-IA-001) y propuestas que ya tiene cada uno,
 * para no duplicarlas. Solo lectura. La bandeja y la revisión no lo usan: el back-end ya devuelve la atención
 * y el informe con cada propuesta (AV-355).
 */
import { listarExtracciones } from '@/services/api/ia'
import { listarReportes } from '@/services/api/tercerizados'
import type { SugerenciaIA } from '@/types/ia'
import type { ReporteProveedor } from '@/types/tercerizados'

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

/** El informe incluye el documento «Informe final» (el que analiza la IA). */
export function tieneInformeFinal(reporte: ReporteProveedor): boolean {
  return reporte.documentos.some((d) => d.categoria === 'InformeFinal')
}
