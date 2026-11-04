/**
 * Lógica pura del calendario con capas (AV-266): restricciones y actividades en un mismo calendario. Reparte los
 * eventos de cada semana en carriles para que una actividad o restricción de varios días se pinte como una sola
 * barra, y cuenta lo que no cabe para el «+N más» de cada día. Se prueba en `calendarioCapas.test.ts`.
 */
import type { TipoEventoCalendario } from '@/components/ui/EventoCalendario'
import type { FechaIso } from '@/types/comun'
import type { EfectoRestriccion, EstadoProgramacion, Programacion, Restriccion } from '@/types/planificacion'
import { rangoDelMes, type Mes } from '@/utils/calendarioRestricciones'
import { sumarDias } from '../resumen/resumenPlanificacion'

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

/** Actividades que se solapan con el periodo, por fecha de inicio (vista Lista). */
export function actividadesDelPeriodo(desde: FechaIso, hasta: FechaIso, eventos: EventoCapa[]): EventoCapa[] {
  return eventos
    .filter((evento) => evento.capa === 'actividad' && evento.inicio <= hasta && evento.fin >= desde)
    .sort((a, b) => a.inicio.localeCompare(b.inicio) || a.texto.localeCompare(b.texto, 'es'))
}

// --- Filtros (se conservan al cambiar de vista) ----------------------------------------------------------

/** Filtros del calendario; cadena vacía es «todos». Cuadrilla, sector y lugar llegan con AV-254. */
export interface FiltrosCalendario {
  /** Tipos de servicio elegidos (varios, como en Figma); vacío, todos. */
  tipos: string[]
  proveedor: string
}

export const SIN_FILTROS: FiltrosCalendario = { tipos: [], proveedor: '' }

/** Valor del filtro de proveedor para las actividades del personal propio. */
export const PERSONAL_PROPIO = 'propio'

export interface OpcionFiltro {
  valor: string
  texto: string
}

/** Aplica los filtros a las actividades; las restricciones se pintan siempre. */
export function filtrarEventos(eventos: EventoCapa[], filtros: FiltrosCalendario): EventoCapa[] {
  return eventos.filter((evento) => {
    if (evento.capa !== 'actividad') return true
    const { tipo_servicio_id, proveedor_id } = evento.programacion
    if (filtros.tipos.length > 0 && !filtros.tipos.includes(String(tipo_servicio_id))) return false
    if (filtros.proveedor === PERSONAL_PROPIO) return proveedor_id === null
    return !filtros.proveedor || String(proveedor_id) === filtros.proveedor
  })
}

/** Proveedores de las actividades cargadas, más «Personal propio» si alguna lo es. */
export function opcionesProveedor(eventos: EventoCapa[]): OpcionFiltro[] {
  const proveedores = new Map<string, string>()
  let hayPropio = false
  for (const evento of eventos) {
    if (evento.capa !== 'actividad') continue
    const { proveedor_id, proveedor } = evento.programacion
    if (proveedor_id === null) hayPropio = true
    else proveedores.set(String(proveedor_id), proveedor ?? `Proveedor ${proveedor_id}`)
  }
  const opciones = [...proveedores].map(([valor, texto]) => ({ valor, texto })).sort((a, b) => a.texto.localeCompare(b.texto, 'es'))
  return hayPropio ? [{ valor: PERSONAL_PROPIO, texto: 'Personal propio' }, ...opciones] : opciones
}

/** Un chip por filtro aplicado («Tipo: Corte de césped», «Proveedor: Podas Altura Demo»), con los filtros sin él. */
export function chipsFiltros(
  filtros: FiltrosCalendario,
  tipos: OpcionFiltro[],
  proveedores: OpcionFiltro[],
): { clave: string; texto: string; sin: FiltrosCalendario }[] {
  const chips = filtros.tipos.map((tipo) => ({
    clave: `tipo-${tipo}`,
    texto: `Tipo: ${tipos.find((t) => t.valor === tipo)?.texto ?? tipo}`,
    sin: { ...filtros, tipos: filtros.tipos.filter((t) => t !== tipo) },
  }))
  if (filtros.proveedor) {
    chips.push({
      clave: 'proveedor',
      texto: `Proveedor: ${proveedores.find((p) => p.valor === filtros.proveedor)?.texto ?? filtros.proveedor}`,
      sin: { ...filtros, proveedor: '' },
    })
  }
  return chips
}

// --- Vista móvil ---------------------------------------------------------------------------------------------

export type PuntoDia = 'prohibicion' | 'aviso' | 'favorable' | 'actividad'

/** Punto bajo el día de la tira semanal (Figma 352-2192): el evento más fuerte del día, o `null` si no hay. */
export function puntoDelDia(dia: FechaIso, eventos: EventoCapa[]): PuntoDia | null {
  const { restricciones, actividades } = eventosDelDia(dia, eventos)
  for (const tipo of ['prohibicion', 'aviso'] as const) if (restricciones.some((r) => r.tipo === tipo)) return tipo
  if (actividades.length > 0) return 'actividad'
  return restricciones.length > 0 ? 'favorable' : null
}

/** Días de la semana con algún evento, en orden, con «Lun 9» y sus eventos (restricciones y actividades). */
export function agendaSemana(dias: FechaIso[], eventos: EventoCapa[]): { dia: FechaIso; texto: string; eventos: EventoCapa[] }[] {
  return dias
    .map((dia, indice) => {
      const { restricciones, actividades } = eventosDelDia(dia, eventos)
      return { dia, texto: `${DIAS_SEMANA_CORTOS[indice]} ${Number(dia.slice(8, 10))}`, eventos: [...actividades, ...restricciones] }
    })
    .filter((d) => d.eventos.length > 0)
}
