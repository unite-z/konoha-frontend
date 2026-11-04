/**
 * Lógica pura del calendario con capas (AV-266): restricciones y actividades en un mismo calendario. Reparte los
 * eventos de cada semana en carriles para que una actividad o restricción de varios días se pinte como una sola
 * barra, y cuenta lo que no cabe para el «+N más» de cada día. Se prueba en `calendarioCapas.test.ts`.
 */
import type { TipoEventoCalendario } from '@/components/ui/EventoCalendario'
import type { FechaIso } from '@/types/comun'
import type { EfectoRestriccion, EstadoProgramacion, Programacion, Restriccion } from '@/types/planificacion'
import { rangoDelMes, type Mes } from '@/utils/calendarioRestricciones'
import { periodoRestriccion, sumarDias } from '../resumen/resumenPlanificacion'

/** Carriles de eventos que caben en una celda del mes; el resto va al «+N más». */
export const CARRILES_VISIBLES = 3

export const DIAS_SEMANA_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const DIAS_SEMANA_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

const TIPO_RESTRICCION: Record<EfectoRestriccion, TipoEventoCalendario> = {
  Prohibicion: 'prohibicion',
  Advertencia: 'aviso',
  Favorable: 'favorable',
}

const TIPO_ACTIVIDAD: Record<Exclude<EstadoProgramacion, 'Cancelada'>, TipoEventoCalendario> = {
  Programada: 'programada',
  EnCurso: 'enCurso',
  Completada: 'completada',
}

export type EventoCapa =
  | { clave: string; capa: 'restriccion'; tipo: TipoEventoCalendario; texto: string; inicio: FechaIso; fin: FechaIso; restriccion: Restriccion }
  | { clave: string; capa: 'actividad'; tipo: TipoEventoCalendario; texto: string; inicio: FechaIso; fin: FechaIso; programacion: Programacion }

/** Restricciones y actividades como eventos del calendario. Las programaciones canceladas no se pintan. */
export function eventosDeCapas(restricciones: Restriccion[], programaciones: Programacion[]): EventoCapa[] {
  const eventos: EventoCapa[] = restricciones.map((restriccion) => ({
    clave: `r-${restriccion.id}`,
    capa: 'restriccion',
    tipo: TIPO_RESTRICCION[restriccion.efecto],
    texto: restriccion.tipo,
    inicio: restriccion.fecha_inicio,
    fin: restriccion.fecha_fin,
    restriccion,
  }))
  for (const programacion of programaciones) {
    if (programacion.estado === 'Cancelada') continue
    const inicio = programacion.fecha_inicio_real ?? programacion.fecha_inicio_prevista
    const fin = programacion.fecha_fin_real ?? (programacion.fecha_fin_prevista < inicio ? inicio : programacion.fecha_fin_prevista)
    eventos.push({
      clave: `p-${programacion.id}`,
      capa: 'actividad',
      tipo: TIPO_ACTIVIDAD[programacion.estado],
      texto: programacion.servicio,
      inicio,
      fin,
      programacion,
    })
  }
  return eventos
}

/** Semanas (de lunes a domingo) que cubren el mes: 5 o 6 filas de 7 fechas. */
export function semanasDelMes(mes: Mes): FechaIso[][] {
  const { desde, hasta } = rangoDelMes(mes)
  const diaSemana = (new Date(`${desde}T00:00:00Z`).getUTCDay() + 6) % 7
  const semanas: FechaIso[][] = []
  for (let lunes = sumarDias(desde, -diaSemana); lunes <= hasta; lunes = sumarDias(lunes, 7)) {
    semanas.push(Array.from({ length: 7 }, (_, indice) => sumarDias(lunes, indice)))
  }
  return semanas
}

export interface SegmentoSemana {
  evento: EventoCapa
  /** Columna de inicio (1 a 7) y número de días que ocupa dentro de la semana. */
  columna: number
  dias: number
  carril: number
  /** La barra empieza antes del lunes o sigue después del domingo. */
  sigueAntes: boolean
  sigueDespues: boolean
}

export interface SemanaCapas {
  dias: FechaIso[]
  /** Segmentos visibles, en carriles de 0 a `CARRILES_VISIBLES - 1`. */
  segmentos: SegmentoSemana[]
  /** Eventos sin sitio en cada día, para el «+N más». */
  ocultos: number[]
}

/**
 * Reparte los eventos de una semana en carriles: primero las restricciones (todo el día), después las actividades,
 * y dentro de cada capa por fecha de inicio y de más larga a más corta. Cada evento va al primer carril libre en
 * todos sus días.
 */
export function distribuirSemana(dias: FechaIso[], eventos: EventoCapa[]): SemanaCapas {
  const lunes = dias[0]
  const domingo = dias[6]
  const enSemana = eventos
    .filter((evento) => evento.inicio <= domingo && evento.fin >= lunes)
    .sort(
      (a, b) =>
        (a.capa === b.capa ? 0 : a.capa === 'restriccion' ? -1 : 1) ||
        a.inicio.localeCompare(b.inicio) ||
        b.fin.localeCompare(a.fin) ||
        a.clave.localeCompare(b.clave),
    )
  const ocupados: boolean[][] = []
  const segmentos: SegmentoSemana[] = []
  const ocultos = Array.from({ length: 7 }, () => 0)
  for (const evento of enSemana) {
    const desde = evento.inicio < lunes ? 0 : dias.indexOf(evento.inicio)
    const hasta = evento.fin > domingo ? 6 : dias.indexOf(evento.fin)
    let carril = 0
    while (ocupados[carril]?.slice(desde, hasta + 1).some(Boolean)) carril += 1
    ocupados[carril] ??= Array.from({ length: 7 }, () => false)
    for (let columna = desde; columna <= hasta; columna += 1) ocupados[carril][columna] = true
    if (carril < CARRILES_VISIBLES) {
      segmentos.push({ evento, columna: desde + 1, dias: hasta - desde + 1, carril, sigueAntes: evento.inicio < lunes, sigueDespues: evento.fin > domingo })
    } else {
      for (let columna = desde; columna <= hasta; columna += 1) ocultos[columna] += 1
    }
  }
  return { dias, segmentos, ocultos }
}

/** Restricciones y actividades de un día, en el orden de la agenda. */
export function eventosDelDia(dia: FechaIso, eventos: EventoCapa[]): { restricciones: EventoCapa[]; actividades: EventoCapa[] } {
  const delDia = eventos.filter((evento) => evento.inicio <= dia && evento.fin >= dia).sort((a, b) => a.inicio.localeCompare(b.inicio))
  return {
    restricciones: delDia.filter((evento) => evento.capa === 'restriccion'),
    actividades: delDia.filter((evento) => evento.capa === 'actividad'),
  }
}

/** «Jueves 12». */
export function tituloDia(dia: FechaIso): string {
  const nombre = DIAS_SEMANA_LARGOS[new Date(`${dia}T00:00:00Z`).getUTCDay()]
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${Number(dia.slice(8, 10))}`
}

/** Nombre accesible de una celda: «jueves 12, 1 restricción, 2 actividades». */
export function etiquetaDia(dia: FechaIso, eventos: EventoCapa[]): string {
  const { restricciones, actividades } = eventosDelDia(dia, eventos)
  const partes = [tituloDia(dia).toLowerCase()]
  if (restricciones.length > 0) partes.push(`${restricciones.length} ${restricciones.length === 1 ? 'restricción' : 'restricciones'}`)
  if (actividades.length > 0) partes.push(`${actividades.length} ${actividades.length === 1 ? 'actividad' : 'actividades'}`)
  return partes.join(', ')
}

// --- Vista Semana --------------------------------------------------------------------------------------------

const MESES_CORTOS = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sept.', 'oct.', 'nov.', 'dic.']

/** Lunes a domingo de la semana de `fecha`. */
export function diasDeSemana(fecha: FechaIso): FechaIso[] {
  const lunes = sumarDias(fecha, -((new Date(`${fecha}T00:00:00Z`).getUTCDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, indice) => sumarDias(lunes, indice))
}

/** «16 al 22 nov. 2026», o «30 nov. al 06 dic. 2026» si la semana cruza de mes. */
export function tituloSemana(dias: FechaIso[]): string {
  const [inicio, fin] = [dias[0], dias[6]]
  const mesFin = `${MESES_CORTOS[Number(fin.slice(5, 7)) - 1]} ${fin.slice(0, 4)}`
  if (inicio.slice(0, 7) === fin.slice(0, 7)) return `${Number(inicio.slice(8, 10))} al ${Number(fin.slice(8, 10))} ${mesFin}`
  return `${Number(inicio.slice(8, 10))} ${MESES_CORTOS[Number(inicio.slice(5, 7)) - 1]} al ${Number(fin.slice(8, 10))} ${mesFin}`
}

/** Fila «todo el día» de la semana: restricciones y actividades de varios días, en carriles. */
export function filaTodoElDia(dias: FechaIso[], eventos: EventoCapa[]): SemanaCapas {
  return distribuirSemana(dias, eventos.filter((evento) => evento.capa === 'restriccion' || evento.inicio !== evento.fin))
}

/** Actividades de un solo día, para la columna de ese día. */
export function actividadesDeUnDia(dia: FechaIso, eventos: EventoCapa[]): EventoCapa[] {
  return eventos.filter((evento) => evento.capa === 'actividad' && evento.inicio === dia && evento.fin === dia)
}

/** Restricciones que coinciden con los días de una actividad («Coincide con»). */
export function coincidencias(actividad: EventoCapa, eventos: EventoCapa[]): EventoCapa[] {
  return eventos
    .filter((evento) => evento.capa === 'restriccion' && evento.inicio <= actividad.fin && evento.fin >= actividad.inicio)
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
}

/** Fechas de un evento: «jue. 19 nov.» o «16 al 19 nov.». */
export function periodoEvento(evento: EventoCapa): string {
  return periodoRestriccion(evento.inicio, evento.fin)
}
