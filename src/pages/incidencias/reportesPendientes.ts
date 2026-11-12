/**
 * Incidencias reportadas sin conexión que esperan a enviarse (AV-282, Figma 394-9964), sobre la cola común de RF-T-012
 * (AV-226): sobreviven a cerrar la aplicación y se envían al volver la red aunque «Mis incidencias» no esté abierta.
 *
 * Cada reporte conserva su hora real (`reportado_en`) y su UUID como `Idempotency-Key`: reenviarlo no duplica la
 * incidencia. El ejecutor `incidencia.reporte` está en `sincronizacion/ejecutores.ts`.
 */
import { encolar, porSincronizar, useCola } from '@/sincronizacion/cola'
import type { NuevaIncidencia, ReportePendiente } from '@/types/incidencias'

export const TIPO_REPORTE = 'incidencia.reporte'

/** Guarda el reporte en la cola del dispositivo, con la hora del momento en que se hace. */
export async function anadirPendiente(cuerpo: NuevaIncidencia, foto: File | null, usuarioId: number): Promise<string> {
  const creadoEn = new Date().toISOString()
  return encolar({
    tipo: TIPO_REPORTE,
    carga: { cuerpo: { ...cuerpo, reportado_en: creadoEn } },
    archivo: foto,
    nombre_archivo: foto?.name ?? null,
    descripcion: `Incidencia · ${cuerpo.tipo} en ${cuerpo.espacio}`,
    usuario_id: usuarioId,
    creado_en: creadoEn,
  })
}

/** Los reportes que siguen en la cola (también los rechazados, con su motivo). */
export function usePendientes(): ReportePendiente[] {
  const cola = useCola()
  return porSincronizar(cola, TIPO_REPORTE).map((p) => {
    const cuerpo = p.carga.cuerpo as NuevaIncidencia
    return { clave: p.id, tipo: cuerpo.tipo, espacio: cuerpo.espacio, creado_en: p.creado_en, error: p.estado === 'rechazada' ? (p.error ?? null) : null }
  })
}
