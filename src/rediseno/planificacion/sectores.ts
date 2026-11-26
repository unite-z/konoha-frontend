/** Lógica pura de la vista Sectores (AV-454, RD-28): ciclo elegido, avance global, columnas y ventana de «Esta semana». */
import { sumarDias } from '@/pages/planificacion/resumen/resumenPlanificacion'
import type { FechaIso, InstanteIso } from '@/types/comun'
import type { Programacion, Restriccion } from '@/types/planificacion'
import type { AvanceServicioSector, ResumenSectores, ServicioSector } from '@/types/resumenSectores'
import { instanteALocalLima } from '@/utils/instanteLima'

/** Días de «Esta semana» y de su ampliación. */
export const DIAS_SEMANA = 7
export const DIAS_AMPLIADOS = 14

export const SERVICIOS_SECTOR: { clave: ServicioSector; texto: string }[] = [
  { clave: 'corte', texto: 'Corte' },
  { clave: 'riego', texto: 'Riego' },
  { clave: 'poda', texto: 'Poda' },
]

/**
 * Ciclo que se muestra al entrar: el pedido por la URL si existe; si no, el que está en curso, el próximo
 * programado o el último completado. `null` si no hay ninguno (los cancelados no cuentan).
 */
export function cicloInicial(ciclos: Programacion[], hoy: FechaIso, pedido: number | null): Programacion | null {
  const validos = ciclos.filter((c) => c.estado !== 'Cancelada')
  const elegido = validos.find((c) => c.id === pedido)
  if (elegido) return elegido
  const enCurso = validos.filter((c) => c.estado === 'EnCurso').sort((a, b) => a.fecha_inicio_prevista.localeCompare(b.fecha_inicio_prevista))
  if (enCurso[0]) return enCurso[0]
  const proximo = validos
    .filter((c) => c.estado === 'Programada' && c.fecha_fin_prevista >= hoy)
    .sort((a, b) => a.fecha_inicio_prevista.localeCompare(b.fecha_inicio_prevista))[0]
  if (proximo) return proximo
  return [...validos].sort((a, b) => b.fecha_inicio_prevista.localeCompare(a.fecha_inicio_prevista))[0] ?? null
}

/** Ciclos que se pueden elegir: no cancelados, de los más recientes a los más antiguos. */
export function ciclosElegibles(ciclos: Programacion[]): Programacion[] {
  return ciclos.filter((c) => c.estado !== 'Cancelada').sort((a, b) => b.fecha_inicio_prevista.localeCompare(a.fecha_inicio_prevista) || b.id - a.id)
}

/** «CC-2026-11 · Corte de césped», o solo el servicio si el ciclo no tiene código. */
export function nombreCiclo(ciclo: Programacion): string {
  return ciclo.codigo ? `${ciclo.codigo} · ${ciclo.servicio}` : ciclo.servicio
}

/** Servicios que trae el resumen, en el orden corte, riego y poda: sin RD-15 completo, solo corte. */
export function serviciosPresentes(resumen: ResumenSectores): { clave: ServicioSector; texto: string }[] {
  const presentes = new Set(resumen.sectores.flatMap((s) => s.servicios.map((v) => v.servicio)))
  return SERVICIOS_SECTOR.filter((s) => presentes.has(s.clave))
}

export function servicioDeSector(servicios: AvanceServicioSector[], clave: ServicioSector): AvanceServicioSector | null {
  return servicios.find((s) => s.servicio === clave) ?? null
}

export interface AvanceGlobal {
  programado: number
  ejecutado: number
  /** 0 a 100 con un decimal, o `null` si no hay nada programado. */
  porcentaje: number | null
}

/** Suma de lo programado y lo ejecutado de todos los sectores y servicios. */
export function avanceGlobal(resumen: ResumenSectores): AvanceGlobal {
  let programado = 0
  let ejecutado = 0
  for (const sector of resumen.sectores) {
    for (const servicio of sector.servicios) {
      programado += servicio.programado
      ejecutado += servicio.ejecutado
    }
  }
  return { programado, ejecutado, porcentaje: programado > 0 ? Math.round((ejecutado / programado) * 1000) / 10 : null }
}

/** Instante de la última actualización: la más reciente de los servicios, o la hora en que se generó el resumen. */
export function ultimaActualizacion(resumen: ResumenSectores): InstanteIso {
  const instantes = resumen.sectores.flatMap((s) => s.servicios.map((v) => v.actualizado_en)).filter((i): i is InstanteIso => i !== null)
  return instantes.reduce((a, b) => (new Date(a) > new Date(b) ? a : b), resumen.generado_en)
}

/** «Actualizado a las 15:00» (hora de Lima), o `null` si el instante no es válido. */
export function textoActualizacion(instante: InstanteIso): string | null {
  const local = instanteALocalLima(instante)
  return local ? `Actualizado a las ${local.slice(11, 16)}` : null
}

/** «50 %» o «12,5 %»: coma decimal y un decimal solo si lo hay. */
export function textoPorcentaje(valor: number): string {
  return `${String(valor).replace('.', ',')} %`
}

/** Ciclos programados o en curso que ocupan algún día de los próximos `dias` días (hoy incluido). */
export function ciclosDeLaVentana(hoy: FechaIso, dias: number, programaciones: Programacion[]): Programacion[] {
  const hasta = sumarDias(hoy, dias - 1)
  return programaciones
    .filter((p) => (p.estado === 'Programada' || p.estado === 'EnCurso') && p.fecha_inicio_prevista <= hasta && p.fecha_fin_prevista >= hoy)
    .sort((a, b) => a.fecha_inicio_prevista.localeCompare(b.fecha_inicio_prevista) || a.id - b.id)
}

/** Restricciones que ocupan algún día de los próximos `dias` días (hoy incluido). */
export function restriccionesDeLaVentana(hoy: FechaIso, dias: number, restricciones: Restriccion[]): Restriccion[] {
  const hasta = sumarDias(hoy, dias - 1)
  return restricciones.filter((r) => r.fecha_inicio <= hasta && r.fecha_fin >= hoy)
}
