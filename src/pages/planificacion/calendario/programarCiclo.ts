/**
 * Lógica pura del panel «Programar ciclo» (AV-267): conflictos en vivo con las restricciones, validación (periodo,
 * duración con limpieza, prohibiciones y justificación de avisos), franja de días y ventana libre. Las reglas son
 * las del backend (`ProgramacionServicios`), que vuelve a comprobarlas al guardar. Se prueba en
 * `programarCiclo.test.ts`.
 */
import type { FechaIso } from '@/types/comun'
import type { Restriccion, ServicioPeriodico } from '@/types/planificacion'
import { fechaNumerica, sumarDias } from '../resumen/resumenPlanificacion'

/** Máximo de la justificación (`@Size(max = 300)` en el backend). */
export const MAXIMO_JUSTIFICACION = 300

/** Días que muestra la franja: dos antes del inicio y el resto después. */
const DIAS_FRANJA = 10
const LETRAS_DIA = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

const FECHA_VALIDA = /^\d{4}-\d{2}-\d{2}$/

/** Días de un periodo, ambos incluidos. */
export function diasDelPeriodo(inicio: FechaIso, fin: FechaIso): number {
  return Math.round((Date.parse(`${fin}T00:00:00Z`) - Date.parse(`${inicio}T00:00:00Z`)) / 86_400_000) + 1
}

/**
 * Restricciones que afectan al periodo: las prohibiciones y los avisos que se solapan con él. Las que solo valen
 * para servicios ruidosos no afectan a uno que no lo es; las favorables nunca son conflicto.
 */
export function conflictosDelPeriodo(restricciones: Restriccion[], inicio: FechaIso, fin: FechaIso, ruidoso: boolean): Restriccion[] {
  return restricciones
    .filter(
      (r) =>
        r.efecto !== 'Favorable' &&
        r.fecha_inicio <= fin &&
        r.fecha_fin >= inicio &&
        (!r.aplica_servicios_ruidosos || ruidoso),
    )
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio) || a.id - b.id)
}

export interface ValidacionProgramacion {
  /** Error del periodo bajo el campo «Fin» (fechas vacías, fin antes del inicio o más días de los permitidos). */
  errorPeriodo: string | null
  /** «5 días seleccionados», bajo la franja, cuando el periodo pasa del máximo. */
  diasExcedidos: string | null
  /** Las fechas no caen en la ventana mensual elegida (solo tercerizados, AV-253). */
  errorVentana: string | null
  prohibiciones: Restriccion[]
  avisos: Restriccion[]
  /** Con avisos hay que justificar la fecha. */
  requiereJustificacion: boolean
  errorJustificacion: string | null
  puedeGuardar: boolean
}

/** Valida lo que el jefe va a programar, con las mismas reglas que el backend. */
export function validarProgramacion(
  servicio: ServicioPeriodico | undefined,
  inicio: string,
  fin: string,
  conflictos: Restriccion[],
  justificacion: string,
  /** Mes `AAAA-MM` de la ventana, si el servicio es tercerizado. */
  ventana: string | null = null,
): ValidacionProgramacion {
  let errorPeriodo: string | null = null
  let diasExcedidos: string | null = null
  if (!FECHA_VALIDA.test(inicio) || !FECHA_VALIDA.test(fin)) errorPeriodo = 'Indica el inicio y el fin.'
  else if (fin < inicio) errorPeriodo = 'Debe ser posterior al inicio'
  else if (servicio?.duracion) {
    const { duracion_maxima_dias: maxima, dias_limpieza: limpieza } = servicio.duracion
    const dias = diasDelPeriodo(inicio, fin)
    const permitidos = maxima + (limpieza ?? 0)
    if (dias > permitidos) {
      errorPeriodo = `${dias} días: máximo ${maxima}${limpieza ? ` + ${limpieza} de limpieza` : ''}`
      diasExcedidos = `${dias} días seleccionados`
    }
  }
  const errorVentana =
    ventana && FECHA_VALIDA.test(inicio) && FECHA_VALIDA.test(fin) && (inicio.slice(0, 7) !== ventana || fin.slice(0, 7) !== ventana)
      ? 'Las fechas tienen que caer en el mes de la ventana'
      : null
  const prohibiciones = conflictos.filter((r) => r.efecto === 'Prohibicion')
  const avisos = conflictos.filter((r) => r.efecto === 'Advertencia')
  const requiereJustificacion = avisos.length > 0
  const texto = justificacion.trim()
  const errorJustificacion =
    requiereJustificacion && !texto ? 'Justifica por qué se programa en estas fechas.'
    : texto.length > MAXIMO_JUSTIFICACION ? `Máximo ${MAXIMO_JUSTIFICACION} caracteres.`
    : null
  return {
    errorPeriodo,
    diasExcedidos,
    errorVentana,
    prohibiciones,
    avisos,
    requiereJustificacion,
    errorJustificacion,
    puedeGuardar: Boolean(servicio?.duracion) && !errorPeriodo && !errorVentana && prohibiciones.length === 0 && !errorJustificacion,
  }
}

/** «4 días: 3 de corte + 1 de limpieza», como en Figma («de corte» en el corte de césped; si no, «de servicio»). */
export function textoDuracion(servicio: ServicioPeriodico | undefined): string | null {
  if (!servicio?.duracion) return null
  const { duracion_maxima_dias: maxima, dias_limpieza: limpieza } = servicio.duracion
  const total = maxima + (limpieza ?? 0)
  const de = servicio.nombre.toLowerCase().startsWith('corte') ? 'de corte' : 'de servicio'
  return limpieza ? `${total} días: ${maxima} ${de} + ${limpieza} de limpieza` : `${total} ${total === 1 ? 'día' : 'días'} ${de}`
}

/** Meses que se ofrecen como ventana de un tercerizado: el del inicio propuesto y los dos siguientes. */
export function mesesVentana(desde: FechaIso): { valor: string; texto: string }[] {
  const nombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const [anio, mes] = desde.split('-').map(Number)
  return [0, 1, 2].map((desplazamiento) => {
    const fecha = new Date(Date.UTC(anio, mes - 1 + desplazamiento, 1))
    return { valor: fecha.toISOString().slice(0, 7), texto: `${nombres[fecha.getUTCMonth()]} ${fecha.getUTCFullYear()}` }
  })
}

export interface DiaFranja {
  fecha: FechaIso
  letra: string
  dia: number
  seleccionado: boolean
  restriccion: 'prohibicion' | 'aviso' | null
}

/** Franja de días alrededor del inicio: el periodo marcado y cada día con su peor restricción. */
export function franjaDeDias(inicio: string, fin: string, restricciones: Restriccion[]): DiaFranja[] {
  if (!FECHA_VALIDA.test(inicio)) return []
  const primero = sumarDias(inicio, -2)
  return Array.from({ length: DIAS_FRANJA }, (_, indice) => {
    const fecha = sumarDias(primero, indice)
    const del = restricciones.filter((r) => r.fecha_inicio <= fecha && r.fecha_fin >= fecha)
    return {
      fecha,
      letra: LETRAS_DIA[new Date(`${fecha}T00:00:00Z`).getUTCDay()],
      dia: Number(fecha.slice(8, 10)),
      seleccionado: FECHA_VALIDA.test(fin) && fecha >= inicio && fecha <= fin,
      restriccion: del.some((r) => r.efecto === 'Prohibicion') ? 'prohibicion' : del.some((r) => r.efecto === 'Advertencia') ? 'aviso' : null,
    }
  })
}

/** Ventana libre que propone el backend, con la duración completa del servicio. */
export function ventanaLibre(inicioLibre: FechaIso | null, servicio: ServicioPeriodico | undefined): { inicio: FechaIso; fin: FechaIso } | null {
  if (!inicioLibre || !servicio?.duracion) return null
  const total = servicio.duracion.duracion_maxima_dias + (servicio.duracion.dias_limpieza ?? 0)
  return { inicio: inicioLibre, fin: sumarDias(inicioLibre, total - 1) }
}

/** «16 al 19/11» o «16/11» para el texto de la ventana libre, como en Figma. */
export function textoVentana({ inicio, fin }: { inicio: FechaIso; fin: FechaIso }): string {
  return inicio === fin ? fechaNumerica(inicio) : `${inicio.slice(8, 10)} al ${fechaNumerica(fin)}`
}
