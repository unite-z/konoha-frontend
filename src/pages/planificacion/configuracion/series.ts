/**
 * Series de restricciones (AV-268, Figma 366-3687): las restricciones de hoy en adelante, una fila por serie (las
 * creadas con una misma repetición, `serie`) o por restricción suelta. Se prueba en `series.test.ts`.
 */
import type { FechaIso } from '@/types/comun'
import type { EfectoRestriccion, Restriccion } from '@/types/planificacion'
import { fechaNumerica, listaConY, sumarDias } from '../resumen/resumenPlanificacion'

/** Periodo que se consulta: de hoy a 399 días (el backend admite 400 como máximo). */
export function rangoSeries(hoy: FechaIso): { desde: FechaIso; hasta: FechaIso } {
  return { desde: hoy, hasta: sumarDias(hoy, 399) }
}

export interface SerieRestriccion {
  /** `serie` o, si es suelta, `r-<id>`. */
  clave: string
  /** `null`: restricción suelta. */
  serie: string | null
  tipo: string
  efecto: EfectoRestriccion
  descripcion: string | null
  primera: FechaIso
  ultima: FechaIso
  fechas: number
  /** Días de la semana de las fechas (0 domingo a 6 sábado), sin repetir. */
  diasSemana: number[]
  aplica_servicios_ruidosos: boolean
  area_verde_id: number | null
  /** Nombre del área verde (AV-365). */
  area_verde: string | null
  /** La restricción que se da de baja: con `serie=true`, `DELETE restricciones/{id}/` da de baja toda la serie. */
  idBaja: number
}

function diaSemana(fecha: FechaIso): number {
  return new Date(`${fecha}T00:00:00Z`).getUTCDay()
}

export function agruparSeries(restricciones: Restriccion[], hoy: FechaIso): SerieRestriccion[] {
  const filas = new Map<string, SerieRestriccion>()
  for (const r of restricciones) {
    if (r.fecha_fin < hoy) continue
    const clave = r.serie ?? `r-${r.id}`
    const actual = filas.get(clave)
    if (!actual) {
      filas.set(clave, {
        clave,
        serie: r.serie,
        tipo: r.tipo,
        efecto: r.efecto,
        descripcion: r.descripcion,
        primera: r.fecha_inicio,
        ultima: r.fecha_fin,
        fechas: 1,
        diasSemana: [diaSemana(r.fecha_inicio)],
        aplica_servicios_ruidosos: r.aplica_servicios_ruidosos,
        area_verde_id: r.area_verde_id,
        area_verde: r.area_verde ?? null,
        idBaja: r.id,
      })
      continue
    }
    actual.fechas += 1
    if (!actual.diasSemana.includes(diaSemana(r.fecha_inicio))) actual.diasSemana.push(diaSemana(r.fecha_inicio))
    if (r.fecha_inicio < actual.primera) actual.primera = r.fecha_inicio
    if (r.fecha_fin > actual.ultima) actual.ultima = r.fecha_fin
  }
  return [...filas.values()].sort((a, b) => a.primera.localeCompare(b.primera) || a.tipo.localeCompare(b.tipo))
}

const NOMBRES_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/** «Cada jueves · hasta 31/12», «23 al 28/11» o «15/11», como la columna Fechas de Figma (sin raya). */
export function textoFechasSerie(serie: SerieRestriccion): string {
  if (serie.fechas > 1) {
    const dias = [...serie.diasSemana].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => NOMBRES_DIA[d])
    return `Cada ${listaConY(dias)} · hasta ${fechaNumerica(serie.ultima)}`
  }
  if (serie.primera === serie.ultima) return fechaNumerica(serie.primera)
  return serie.primera.slice(0, 7) === serie.ultima.slice(0, 7)
    ? `${serie.primera.slice(8, 10)} al ${fechaNumerica(serie.ultima)}`
    : `${fechaNumerica(serie.primera)} al ${fechaNumerica(serie.ultima)}`
}

/**
 * «Ruidosos · todo el campus» o «Todos · Sociales y Comedor Central»: a qué servicios afecta y dónde, con el nombre
 * del área verde (AV-365); si no llega, «área verde 7».
 */
export function textoAlcance(serie: Pick<SerieRestriccion, 'aplica_servicios_ruidosos' | 'area_verde_id' | 'area_verde'>): string {
  const servicios = serie.aplica_servicios_ruidosos ? 'Ruidosos' : 'Todos'
  const lugar = serie.area_verde_id === null ? 'todo el campus' : (serie.area_verde ?? `área verde ${serie.area_verde_id}`)
  return `${servicios} · ${lugar}`
}
