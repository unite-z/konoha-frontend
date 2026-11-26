/**
 * Guarda un reporte de incidencia en la cola común (RF-T-012) con su foto, su hora real y la misma clave de
 * idempotencia que el envío en línea: si la red se cortó a mitad del envío, reenviarlo no duplica la incidencia.
 * Lo envía el ejecutor `incidencia.reporte` de `sincronizacion/ejecutores.ts`.
 */
import { encolar } from '@/sincronizacion/cola'
import type { NuevaIncidencia } from '@/types/incidencias'

export async function encolarReporte(
  cuerpo: NuevaIncidencia,
  foto: File | null,
  usuarioId: number,
  clave: string,
): Promise<string> {
  const creadoEn = new Date().toISOString()
  return encolar({
    id: clave,
    tipo: 'incidencia.reporte',
    carga: { cuerpo: { ...cuerpo, reportado_en: creadoEn } },
    archivo: foto,
    nombre_archivo: foto?.name ?? null,
    descripcion: `Incidencia · ${cuerpo.tipo} en ${cuerpo.espacio}`,
    usuario_id: usuarioId,
    creado_en: creadoEn,
  })
}
