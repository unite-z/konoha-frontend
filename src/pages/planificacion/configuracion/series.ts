/**
 * Series de restricciones (AV-268): restricciones creadas con una misma repetición (`serie`). Se agrupan las fechas
 * de hoy en adelante; una restricción suelta no es serie. Se prueba en `series.test.ts`.
 */
import type { FechaIso } from '@/types/comun'
import type { EfectoRestriccion, Restriccion } from '@/types/planificacion'
import { sumarDias } from '../resumen/resumenPlanificacion'

/** Periodo que se consulta: de hoy a 399 días (el backend admite 400 como máximo). */
export function rangoSeries(hoy: FechaIso): { desde: FechaIso; hasta: FechaIso } {
  return { desde: hoy, hasta: sumarDias(hoy, 399) }
}

export interface SerieRestriccion {
  serie: string
  tipo: string
  efecto: EfectoRestriccion
  descripcion: string | null
  primera: FechaIso
  ultima: FechaIso
  fechas: number
  hora_inicio: string | null
  hora_fin: string | null
  area_verde_id: number | null
  /** Una restricción de la serie: `DELETE restricciones/{id}/?serie=true` da de baja todas. */
  idBaja: number
}

export function agruparSeries(restricciones: Restriccion[], hoy: FechaIso): SerieRestriccion[] {
  const series = new Map<string, SerieRestriccion>()
  for (const r of restricciones) {
    if (!r.serie || r.fecha_fin < hoy) continue
    const actual = series.get(r.serie)
    if (!actual) {
      series.set(r.serie, {
        serie: r.serie,
        tipo: r.tipo,
        efecto: r.efecto,
        descripcion: r.descripcion,
        primera: r.fecha_inicio,
        ultima: r.fecha_fin,
        fechas: 1,
        hora_inicio: r.hora_inicio,
        hora_fin: r.hora_fin,
        area_verde_id: r.area_verde_id,
        idBaja: r.id,
      })
      continue
    }
    actual.fechas += 1
    if (r.fecha_inicio < actual.primera) actual.primera = r.fecha_inicio
    if (r.fecha_fin > actual.ultima) actual.ultima = r.fecha_fin
  }
  return [...series.values()].sort((a, b) => a.primera.localeCompare(b.primera) || a.tipo.localeCompare(b.tipo))
}

/** Sin área verde, la restricción es de todo el campus. El nombre del área no llega en el contrato. */
export function textoAlcance(areaVerdeId: number | null): string {
  return areaVerdeId === null ? 'Todo el campus' : `Área verde ${areaVerdeId}`
}
