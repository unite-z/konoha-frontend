/**
 * Lógica pura del detalle de ciclo (AV-269): acciones según el estado, validación de la fecha real, duración y
 * restricciones que coinciden con el periodo. Se prueba en `detalleCiclo.test.ts`.
 */
import type { CambioEstadoCiclo } from '@/services/api/planificacion'
import type { FechaIso } from '@/types/comun'
import type { EstadoProgramacion, Programacion, Restriccion, ServicioPeriodico } from '@/types/planificacion'
import { instanteALocalLima } from '@/utils/instanteLima'
import { horaCorta, textoHorario } from '@/utils/planificacion'
import { diaFigma, dias, fechaCorta, fechaNumerica, listaConY } from '../resumen/resumenPlanificacion'
import { diasDelPeriodo } from '../calendario/programarCiclo'
import { fechasCiclo } from './ciclos'

export interface AccionCiclo {
  cambio: CambioEstadoCiclo
  texto: string
  variante: 'primario' | 'secundario'
}

const ACCIONES: Record<EstadoProgramacion, AccionCiclo[]> = {
  Programada: [
    { cambio: 'cancelacion', texto: 'Cancelar ciclo', variante: 'secundario' },
    { cambio: 'inicio', texto: 'Iniciar ciclo', variante: 'primario' },
  ],
  EnCurso: [{ cambio: 'fin', texto: 'Finalizar ciclo', variante: 'primario' }],
  Completada: [],
  Cancelada: [],
}

/** Transiciones que permite el backend: Programada a En curso o Cancelada; En curso a Completada. */
export function accionesCiclo(estado: EstadoProgramacion): AccionCiclo[] {
  return ACCIONES[estado]
}

/** Inicio real si lo hay; si no, el previsto. */
export function inicioEfectivo(ciclo: Programacion): FechaIso {
  return ciclo.fecha_inicio_real ?? ciclo.fecha_inicio_prevista
}

/** Error de la fecha real de inicio o fin, o `undefined` si es válida. */
export function validarFechaReal(cambio: 'inicio' | 'fin', fecha: string, ciclo: Programacion, hoy: FechaIso): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return 'Indica la fecha.'
  if (fecha > hoy) return 'La fecha no puede ser posterior a hoy.'
  const inicio = inicioEfectivo(ciclo)
  if (cambio === 'fin' && fecha < inicio) return `El fin no puede ser anterior al inicio (${fechaCorta(inicio)}).`
  return undefined
}

export interface DuracionCiclo {
  valor: string
  contexto: string
  /** Días por encima de los previstos (0 si no se excede). */
  exceso: number
}

/** Días previstos; en curso, los transcurridos sobre los previstos; completado, los reales. */
export function duracionCiclo(ciclo: Programacion, hoy: FechaIso): DuracionCiclo {
  const previstos = diasDelPeriodo(ciclo.fecha_inicio_prevista, ciclo.fecha_fin_prevista)
  const inicio = inicioEfectivo(ciclo)
  if (ciclo.estado === 'EnCurso') {
    const transcurridos = hoy < inicio ? 0 : diasDelPeriodo(inicio, hoy)
    return { valor: `${transcurridos} de ${previstos}`, contexto: 'Días transcurridos sobre los previstos', exceso: Math.max(0, transcurridos - previstos) }
  }
  if (ciclo.estado === 'Completada' && ciclo.fecha_fin_real) {
    const reales = diasDelPeriodo(inicio, ciclo.fecha_fin_real)
    return { valor: dias(reales), contexto: `${dias(previstos)} previstos`, exceso: Math.max(0, reales - previstos) }
  }
  return { valor: dias(previstos), contexto: 'Previstos', exceso: 0 }
}

/** Periodo en el que se buscan las restricciones del ciclo: el previsto, ampliado hasta el fin real o hasta hoy si sigue en curso. */
export function periodoCiclo(ciclo: Programacion, hoy: FechaIso): { desde: FechaIso; hasta: FechaIso } {
  const desde = [ciclo.fecha_inicio_prevista, inicioEfectivo(ciclo)].sort()[0]
  const finReal = ciclo.fecha_fin_real ?? (ciclo.estado === 'EnCurso' ? hoy : ciclo.fecha_fin_prevista)
  const hasta = [ciclo.fecha_fin_prevista, finReal].sort().at(-1) ?? ciclo.fecha_fin_prevista
  return { desde, hasta }
}

/** Franja horaria del servicio («06:00 a 18:00») o `null` si no tiene. */
function franja(servicio: ServicioPeriodico | undefined): string | null {
  const duracion = servicio?.duracion
  return duracion?.hora_inicio || duracion?.hora_fin ? textoHorario(duracion.hora_inicio, duracion.hora_fin) : null
}

/** «Fumigaciones Demo S.A. · 30/11 · 06:00 a 18:00», bajo el título (Figma 380-7171). */
export function subtituloCiclo(ciclo: Programacion, servicio: ServicioPeriodico | undefined): string {
  return [ciclo.proveedor ?? 'Personal propio', fechasCiclo(ciclo.fecha_inicio_prevista, ciclo.fecha_fin_prevista), franja(servicio)]
    .filter(Boolean)
    .join(' · ')
}

export interface IndicadorCiclo {
  etiqueta: string
  valor: string
  contexto?: string
  nota?: string
  /** Días por encima del máximo (0 si no se excede). */
  exceso: number
}

/** «Máximo 1 día» o «Máximo 3 + 1 de limpieza». */
function textoMaximo(servicio: ServicioPeriodico | undefined, previstos: number): string {
  const duracion = servicio?.duracion
  if (!duracion) return `${dias(previstos)} previstos`
  return duracion.dias_limpieza
    ? `Máximo ${duracion.duracion_maxima_dias} + ${duracion.dias_limpieza} de limpieza`
    : `Máximo ${dias(duracion.duracion_maxima_dias)}`
}

/** «1 aviso», «2 avisos y 1 prohibición» o «Ninguna», con los días («Jue 19 · con constancia»). */
export function indicadorRestricciones(conflictos: Restriccion[]): IndicadorCiclo {
  if (conflictos.length === 0) return { etiqueta: 'Restricciones', valor: 'Ninguna', contexto: 'Sin conflictos', exceso: 0 }
  const avisos = conflictos.filter((r) => r.efecto === 'Advertencia').length
  const prohibiciones = conflictos.filter((r) => r.efecto === 'Prohibicion').length
  const valor = listaConY(
    [avisos && `${avisos} ${avisos === 1 ? 'aviso' : 'avisos'}`, prohibiciones && `${prohibiciones} ${prohibiciones === 1 ? 'prohibición' : 'prohibiciones'}`].filter(
      (parte): parte is string => Boolean(parte),
    ),
  )
  const diasConflicto = listaConY([...new Set(conflictos.map((r) => diaFigma(r.fecha_inicio)))])
  // Con avisos se programó con justificación («con constancia», RF-PLA-004).
  return { etiqueta: 'Restricciones', valor, contexto: avisos > 0 && prohibiciones === 0 ? `${diasConflicto} · con constancia` : diasConflicto, exceso: 0 }
}

/**
 * Los tres indicadores del detalle (Figma 370-3811 y 380-7171): «Fechas previstas» si aún no empezó o «Inicio
 * real» si ya empezó, «Duración» con el máximo y la franja, y «Restricciones».
 */
export function indicadoresCiclo(ciclo: Programacion, servicio: ServicioPeriodico | undefined, conflictos: Restriccion[], hoy: FechaIso): IndicadorCiclo[] {
  const previstos = diasDelPeriodo(ciclo.fecha_inicio_prevista, ciclo.fecha_fin_prevista)
  const horario = franja(servicio)
  const duracion = duracionCiclo(ciclo, hoy)
  const primero: IndicadorCiclo = ciclo.fecha_inicio_real
    ? {
        etiqueta: 'Inicio real',
        valor: fechaNumerica(ciclo.fecha_inicio_real),
        contexto: ciclo.fecha_fin_real ? `Fin real el ${fechaNumerica(ciclo.fecha_fin_real)}` : ciclo.estado === 'EnCurso' ? 'En curso' : undefined,
        nota: horaCorta(servicio?.duracion?.hora_inicio) ? `Previsto a las ${horaCorta(servicio?.duracion?.hora_inicio)}` : `Previsto el ${fechaNumerica(ciclo.fecha_inicio_prevista)}`,
        exceso: 0,
      }
    : {
        etiqueta: 'Fechas previstas',
        // «16 al 19/11», como en Figma 370-3811 (sin la raya); de un mes a otro, «30/11 al 02/12».
        valor:
          ciclo.fecha_inicio_prevista !== ciclo.fecha_fin_prevista && ciclo.fecha_inicio_prevista.slice(0, 7) === ciclo.fecha_fin_prevista.slice(0, 7)
            ? `${ciclo.fecha_inicio_prevista.slice(8, 10)} al ${fechaNumerica(ciclo.fecha_fin_prevista)}`
            : fechasCiclo(ciclo.fecha_inicio_prevista, ciclo.fecha_fin_prevista),
        contexto: servicio?.duracion?.dias_limpieza
          ? `${servicio.duracion.duracion_maxima_dias} de ${servicio.nombre.toLowerCase().startsWith('corte') ? 'corte' : 'servicio'} + ${servicio.duracion.dias_limpieza} de limpieza`
          : dias(previstos),
        nota: ciclo.estado === 'Cancelada' ? 'Cancelado' : 'Sin iniciar',
        exceso: 0,
      }
  const transcurridos = ciclo.estado === 'EnCurso' ? (hoy < inicioEfectivo(ciclo) ? 0 : diasDelPeriodo(inicioEfectivo(ciclo), hoy)) : null
  return [
    primero,
    {
      etiqueta: 'Duración',
      valor: transcurridos !== null ? dias(transcurridos) : duracion.valor,
      contexto: textoMaximo(servicio, previstos),
      nota: horario ? `Franja ${horario}` : undefined,
      exceso: duracion.exceso,
    },
    indicadorRestricciones(conflictos),
  ]
}

const TEXTO_EVENTO: Record<EstadoProgramacion, string> = {
  Programada: 'Programado',
  EnCurso: 'Iniciado',
  Completada: 'Finalizado',
  Cancelada: 'Cancelado',
}

/** Historial del ciclo, del más reciente al más antiguo: «Iniciado», «30/11 06:10 · Robert G.». */
export function historialCiclo(ciclo: Programacion): { clave: string; texto: string; detalle: string }[] {
  return [...(ciclo.historial ?? [])]
    .sort((a, b) => b.fecha_hora.localeCompare(a.fecha_hora))
    .map((evento) => {
      const local = instanteALocalLima(evento.fecha_hora) ?? evento.fecha_hora
      return { clave: `${evento.estado}-${evento.fecha_hora}`, texto: TEXTO_EVENTO[evento.estado], detalle: `${local.slice(8, 10)}/${local.slice(5, 7)} ${local.slice(11, 16)} · ${evento.autor}` }
    })
}
