/**
 * Reportes de incidencia hechos sin conexión que siguen en la cola común (RF-T-012), con su foto y su hora real
 * (`creado_en`). Es la lectura de `pages/incidencias/reportesPendientes` ampliada con la foto para la miniatura.
 */
import { porSincronizar, useCola } from '@/sincronizacion/cola'
import type { NuevaIncidencia, ReportePendiente } from '@/types/incidencias'

const TIPO_REPORTE = 'incidencia.reporte'

export interface PendienteConFoto extends ReportePendiente {
  foto: Blob | null
}

export function usePendientesConFoto(): PendienteConFoto[] {
  const cola = useCola()
  return porSincronizar(cola, TIPO_REPORTE).map((p) => {
    const cuerpo = p.carga.cuerpo as NuevaIncidencia
    return {
      clave: p.id,
      tipo: cuerpo.tipo,
      espacio: cuerpo.espacio,
      creado_en: p.creado_en,
      error: p.estado === 'rechazada' ? (p.error ?? null) : null,
      foto: p.archivo ?? null,
    }
  })
}
