/**
 * Lógica pura del calendario semanal de Cuadrillas (RD-34): semana de lunes a domingo, posición de cada encargo
 * en ella y fechas nuevas al moverlo. Las fechas son `AAAA-MM-DD` de America/Lima y no pasan por `Date`.
 */
import { diaFigma, sumarDias } from '@/pages/planificacion/resumen/resumenPlanificacion'
import type { EncargoCampo } from '@/types/operacionCampo'
import type { FechaIso } from '@/types/comun'

export const DIAS_SEMANA = 7
const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/

/** Días desde 1970-01-01 (calendario civil proléptico). */
function diasCiviles(fecha: FechaIso): number {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const a = mes <= 2 ? anio - 1 : anio
  const era = Math.floor(a / 400)
  const anioDeEra = a - era * 400
  const diaDelAnio = Math.floor((153 * (mes + (mes > 2 ? -3 : 9)) + 2) / 5) + dia - 1
  const diaDeEra = anioDeEra * 365 + Math.floor(anioDeEra / 4) - Math.floor(anioDeEra / 100) + diaDelAnio
  return era * 146097 + diaDeEra - 719468
}

/** Días de `desde` a `hasta` (negativo si `hasta` es anterior). */
export function diferenciaDias(desde: FechaIso, hasta: FechaIso): number {
  return diasCiviles(hasta) - diasCiviles(desde)
}

/** 0 = lunes … 6 = domingo (el 1/1/1970 fue jueves). */
export function diaDeSemana(fecha: FechaIso): number {
  return (((diasCiviles(fecha) + 3) % DIAS_SEMANA) + DIAS_SEMANA) % DIAS_SEMANA
}

export function lunesDe(fecha: FechaIso): FechaIso {
  return sumarDias(fecha, -diaDeSemana(fecha))
}

export function diasDeSemana(lunes: FechaIso): FechaIso[] {
  return Array.from({ length: DIAS_SEMANA }, (_, i) => sumarDias(lunes, i))
}

/** Lunes de la semana pedida en la URL; sin parámetro válido, el de hoy. */
export function semanaPedida(parametro: string | null, hoy: FechaIso): FechaIso {
  return lunesDe(parametro && PATRON_FECHA.test(parametro) ? parametro : hoy)
}

/** «Lun 23» (nombre del día y número). */
export function etiquetaDia(fecha: FechaIso): string {
  return diaFigma(fecha)
}

/** Tramo de fechas que ocupa el encargo: el directo vive en su plazo; el periódico, en su periodo. */
export function tramoDe(e: Pick<EncargoCampo, 'periodicidad' | 'fecha_inicio' | 'fecha_fin' | 'plazo_previsto'>): {
  inicio: FechaIso
  fin: FechaIso
} {
  return e.periodicidad === 'Directo'
    ? { inicio: e.plazo_previsto, fin: e.plazo_previsto }
    : { inicio: e.fecha_inicio, fin: e.fecha_fin }
}

export interface PosicionSemanal {
  /** Columna de 0 (lunes) a 6 (domingo) donde empieza la parte visible. */
  columna: number
  largo: number
  /** El encargo empieza antes del lunes o termina después del domingo. */
  seSaleAntes: boolean
  seSaleDespues: boolean
}

/** Parte del encargo que cae en la semana, o `null` si no la toca. */
export function posicionEnSemana(
  e: Pick<EncargoCampo, 'periodicidad' | 'fecha_inicio' | 'fecha_fin' | 'plazo_previsto'>,
  lunes: FechaIso,
): PosicionSemanal | null {
  const { inicio, fin } = tramoDe(e)
  const domingo = sumarDias(lunes, DIAS_SEMANA - 1)
  if (fin < lunes || inicio > domingo) return null
  const desde = inicio < lunes ? lunes : inicio
  const hasta = fin > domingo ? domingo : fin
  return {
    columna: diferenciaDias(lunes, desde),
    largo: diferenciaDias(desde, hasta) + 1,
    seSaleAntes: inicio < lunes,
    seSaleDespues: fin > domingo,
  }
}

/**
 * Periodo y plazo nuevos al desplazar el encargo `dias` días, como los pide `DialogoReprogramar`. El directo solo
 * mueve su plazo (y el fin, que es el plazo): su inicio no se reprograma y debe seguir validando contra el plazo.
 */
export function fechasDesplazadas(
  e: Pick<EncargoCampo, 'periodicidad' | 'fecha_inicio' | 'fecha_fin' | 'plazo_previsto'>,
  dias: number,
): { fecha_inicio: FechaIso; fecha_fin: FechaIso; plazo_previsto: FechaIso } {
  const plazo = sumarDias(e.plazo_previsto, dias)
  if (e.periodicidad === 'Directo') return { fecha_inicio: e.fecha_inicio, fecha_fin: plazo, plazo_previsto: plazo }
  return {
    fecha_inicio: sumarDias(e.fecha_inicio, dias),
    fecha_fin: sumarDias(e.fecha_fin, dias),
    plazo_previsto: plazo,
  }
}

/** Día en que se «agarra» el encargo: su inicio (el directo, su plazo). */
export function anclaDe(
  e: Pick<EncargoCampo, 'periodicidad' | 'fecha_inicio' | 'fecha_fin' | 'plazo_previsto'>,
): FechaIso {
  return tramoDe(e).inicio
}

/** Carril (fila) de cada tramo para que los que se solapan en columnas no se pisen. */
export function asignarCarriles(tramos: { columna: number; largo: number }[]): { carriles: number[]; total: number } {
  const finDeCarril: number[] = []
  const carriles = tramos.map((t) => {
    let carril = finDeCarril.findIndex((fin) => fin < t.columna)
    if (carril === -1) carril = finDeCarril.length
    finDeCarril[carril] = t.columna + t.largo - 1
    return carril
  })
  return { carriles, total: Math.max(1, finDeCarril.length) }
}

/** Movimientos que pide un encargo y se tramitan por reprogramación (fechas) o `PUT` (cuadrilla). */
export interface MovimientoEncargo {
  dias: number
  cuadrillaId: number
}

export function hayMovimiento(e: Pick<EncargoCampo, 'cuadrilla_id'>, m: MovimientoEncargo): boolean {
  return m.dias !== 0 || m.cuadrillaId !== e.cuadrilla_id
}
