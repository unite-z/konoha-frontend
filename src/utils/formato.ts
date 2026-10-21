/**
 * Formato de fechas, cifras y duraciones según la Guía Web, sección 7.
 *
 * - Fechas: «02 oct. 2026» (tabla propia de meses; no depende de cómo abrevia cada navegador).
 * - Fecha y hora: «20 oct. 2026, 10:35» (24 h, en la hora de America/Lima).
 * - Cifras: coma decimal y espacio no separable como separador de miles («15,6», «1 240»).
 *
 * Único formateador de la aplicación: las páginas y componentes no formatean por su cuenta.
 */
import type { FechaIso, InstanteIso, Periodo } from '../types/comun'

const MESES = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sept.', 'oct.', 'nov.', 'dic.']

/** Espacio no separable para los miles. */
const ESPACIO_MILES = ' '

/** Zona horaria de los instantes mostrados. */
const ZONA_HORARIA = 'America/Lima'

/** Texto de una celda o valor sin dato. */
export const SIN_VALOR = '—'

const PATRON_FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/

function dosDigitos(valor: number): string {
  return String(valor).padStart(2, '0')
}

/** `true` si el texto es una fecha `AAAA-MM-DD` válida del calendario. */
export function esFechaIsoValida(texto: string): boolean {
  const partes = PATRON_FECHA_ISO.exec(texto)
  if (!partes) return false
  const [anio, mes, dia] = [Number(partes[1]), Number(partes[2]), Number(partes[3])]
  const fecha = new Date(anio, mes - 1, dia)
  return fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia
}

/** Fecha local (`Date`) en formato `AAAA-MM-DD`. */
export function fechaAIso(fecha: Date): FechaIso {
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`
}

/**
 * «02 oct. 2026» a partir de una fecha `AAAA-MM-DD`, interpretada como fecha local (sin desfase de zona).
 * Si recibe un instante ISO, muestra su fecha en la hora de America/Lima.
 */
export function formatearFecha(valor: FechaIso | InstanteIso | null | undefined): string {
  if (!valor) return SIN_VALOR
  const partes = PATRON_FECHA_ISO.exec(valor)
  if (partes) {
    return `${partes[3]} ${MESES[Number(partes[2]) - 1]} ${partes[1]}`
  }
  const enLima = partesEnLima(valor)
  return enLima ? `${dosDigitos(enLima.dia)} ${MESES[enLima.mes - 1]} ${enLima.anio}` : SIN_VALOR
}

/** «20 oct. 2026, 10:35» a partir de un instante ISO 8601, en la hora de America/Lima. */
export function formatearFechaHora(instante: InstanteIso | null | undefined): string {
  if (!instante) return SIN_VALOR
  const p = partesEnLima(instante)
  if (!p) return SIN_VALOR
  return `${dosDigitos(p.dia)} ${MESES[p.mes - 1]} ${p.anio}, ${dosDigitos(p.hora)}:${dosDigitos(p.minuto)}`
}

const formateadorLima = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONA_HORARIA,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hourCycle: 'h23',
})

function partesEnLima(instante: string) {
  const fecha = new Date(instante)
  if (Number.isNaN(fecha.getTime())) return null
  const valores: Record<string, number> = {}
  for (const parte of formateadorLima.formatToParts(fecha)) {
    if (parte.type !== 'literal') valores[parte.type] = Number(parte.value)
  }
  return {
    anio: valores.year,
    mes: valores.month,
    dia: valores.day,
    hora: valores.hour,
    minuto: valores.minute,
  }
}

/**
 * Cifra con coma decimal y espacio no separable para los miles.
 * Con `decimales` fija el número de decimales («83,00»); sin él, muestra hasta 2 decimales («15,6»).
 */
export function formatearNumero(valor: number | null | undefined, decimales?: number): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return SIN_VALOR
  const absoluto = Math.abs(valor)
  const texto = decimales !== undefined ? absoluto.toFixed(decimales) : String(Math.round(absoluto * 100) / 100)
  const [entero, decimal] = texto.split('.')
  const agrupado = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ESPACIO_MILES)
  const signo = valor < 0 && Number(texto) !== 0 ? '-' : ''
  return `${signo}${agrupado}${decimal ? `,${decimal}` : ''}`
}

/** Duración en minutos como «3 h 20 min», «2 h» o «45 min». */
export function formatearMinutos(minutos: number | null | undefined): string {
  if (minutos === null || minutos === undefined || !Number.isFinite(minutos)) return SIN_VALOR
  const horas = Math.floor(minutos / 60)
  const resto = Math.round(minutos % 60)
  if (horas === 0) return `${resto} min`
  if (resto === 0) return `${formatearNumero(horas)} h`
  return `${formatearNumero(horas)} h ${resto} min`
}

/** Semana actual, de lunes a domingo. */
export function semanaActual(hoy: Date = new Date()): Periodo {
  const lunes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const diaSemana = (lunes.getDay() + 6) % 7 // 0 = lunes
  lunes.setDate(lunes.getDate() - diaSemana)
  const domingo = new Date(lunes)
  domingo.setDate(lunes.getDate() + 6)
  return { desde: fechaAIso(lunes), hasta: fechaAIso(domingo) }
}

/** Del 1 de enero del año actual a hoy. */
export function anioActualHastaHoy(hoy: Date = new Date()): Periodo {
  return { desde: `${hoy.getFullYear()}-01-01`, hasta: fechaAIso(hoy) }
}
