/**
 * Lógica pura del Resumen de planificación (AV-265): indicadores del mes, bandeja «Necesita atención» y
 * listas de próximos ciclos y restricciones. Sin React ni red: se prueba en `resumenPlanificacion.test.ts`.
 */
import type { NombreIconoFigma } from '@/components/ui/Icono'
import type { TonoEstado } from '@/components/ui/Estado'
import type { FechaIso } from '@/types/comun'
import type {
  AlertaPlanificacion,
  EfectoRestriccion,
  EstadoProgramacion,
  Programacion,
  Restriccion,
  ServicioPeriodico,
} from '@/types/planificacion'

const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const MESES_CORTOS = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sept.', 'oct.', 'nov.', 'dic.']
const DIAS_SEMANA = ['dom.', 'lun.', 'mar.', 'mié.', 'jue.', 'vie.', 'sáb.']

/** Días que se miran hacia delante en «Próximos 14 días». */
export const DIAS_PROXIMOS = 14
/** Días que se miran hacia delante en «Restricciones próximas». */
export const DIAS_RESTRICCIONES = 30

function aFecha(fecha: FechaIso): Date {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  return new Date(Date.UTC(anio, mes - 1, dia))
}

function aIso(fecha: Date): FechaIso {
  return fecha.toISOString().slice(0, 10)
}

export function sumarDias(fecha: FechaIso, dias: number): FechaIso {
  const resultado = aFecha(fecha)
  resultado.setUTCDate(resultado.getUTCDate() + dias)
  return aIso(resultado)
}

/** Primer y último día del mes de `hoy`. */
export function limitesMes(hoy: FechaIso): { desde: FechaIso; hasta: FechaIso } {
  const fecha = aFecha(hoy)
  const ultimo = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, 0))
  return { desde: `${hoy.slice(0, 7)}-01`, hasta: aIso(ultimo) }
}

/** «Noviembre 2026». */
export function nombreMes(hoy: FechaIso): string {
  const mes = MESES_LARGOS[Number(hoy.slice(5, 7)) - 1]
  return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} ${hoy.slice(0, 4)}`
}

/** «1 día» o «3 días». */
export function dias(n: number): string {
  return n === 1 ? '1 día' : `${n} días`
}

/** Lunes y domingo de la semana de `hoy`. */
function limitesSemana(hoy: FechaIso): { desde: FechaIso; hasta: FechaIso } {
  const diaSemana = (aFecha(hoy).getUTCDay() + 6) % 7
  const desde = sumarDias(hoy, -diaSemana)
  return { desde, hasta: sumarDias(desde, 6) }
}

function seSolapa(inicio: FechaIso, fin: FechaIso, desde: FechaIso, hasta: FechaIso): boolean {
  return inicio <= hasta && fin >= desde
}

export const ESTADO_PROGRAMACION: Record<EstadoProgramacion, { texto: string; tono: TonoEstado }> = {
  Programada: { texto: 'Programada', tono: 'info' },
  EnCurso: { texto: 'En curso', tono: 'acento' },
  Completada: { texto: 'Completada', tono: 'exito' },
  Cancelada: { texto: 'Cancelada', tono: 'neutro' },
}

export const EFECTO_RESTRICCION: Record<EfectoRestriccion, { texto: string; tono: TonoEstado }> = {
  Prohibicion: { texto: 'Prohibición', tono: 'error' },
  Advertencia: { texto: 'Aviso', tono: 'aviso' },
  Favorable: { texto: 'Favorable', tono: 'exito' },
}

export interface IndicadorResumen {
  etiqueta: string
  valor: number
  nota: string
  detalle: string
}

/** Los cuatro indicadores de la cabecera del Resumen. */
export function indicadoresMes(
  hoy: FechaIso,
  programaciones: Programacion[],
  alertas: AlertaPlanificacion[],
  restricciones: Restriccion[],
): IndicadorResumen[] {
  const mes = limitesMes(hoy)
  const semana = limitesSemana(hoy)
  const delMes = programaciones.filter(
    (p) => p.estado !== 'Cancelada' && seSolapa(p.fecha_inicio_prevista, p.fecha_fin_prevista, mes.desde, mes.hasta),
  )
  const estaSemana = delMes.filter((p) => seSolapa(p.fecha_inicio_prevista, p.fecha_fin_prevista, semana.desde, semana.hasta))
  const enCurso = programaciones.filter((p) => p.estado === 'EnCurso')
  const frecuencia = alertas.filter((a) => a.tipo === 'FrecuenciaProxima').length
  const duracion = alertas.filter((a) => a.tipo === 'DuracionExcedida' || a.tipo === 'DuracionProxima').length
  const restriccionesMes = restricciones.filter((r) => seSolapa(r.fecha_inicio, r.fecha_fin, mes.desde, mes.hasta))
  const diasRestringidos = new Set<FechaIso>()
  for (const r of restriccionesMes) {
    for (let dia = r.fecha_inicio < mes.desde ? mes.desde : r.fecha_inicio; dia <= r.fecha_fin && dia <= mes.hasta; dia = sumarDias(dia, 1)) {
      diasRestringidos.add(dia)
    }
  }
  const deProhibicion = restriccionesMes.filter((r) => r.efecto === 'Prohibicion')
  const prohibiciones = deProhibicion.length
  const nombresProhibicion = [...new Set(deProhibicion.map((r) => r.tipo))]
  const primero = enCurso[0]

  return [
    { etiqueta: 'Ciclos programados', valor: delMes.length, nota: `${estaSemana.length} esta semana`, detalle: nombreMes(hoy) },
    {
      etiqueta: 'En curso',
      valor: enCurso.length,
      nota: primero ? primero.servicio : 'Ningún ciclo en curso',
      detalle: primero?.fecha_inicio_real ? `Desde el ${fechaNumerica(primero.fecha_inicio_real)}` : 'Sin inicio registrado',
    },
    {
      etiqueta: 'Alertas',
      valor: alertas.filter((a) => esTipoConocido(a.tipo)).length,
      nota: `${frecuencia} ${frecuencia === 1 ? 'frecuencia' : 'frecuencias'} por vencer`,
      detalle: `${duracion} ${duracion === 1 ? 'duración excedida' : 'duraciones excedidas'}`,
    },
    {
      etiqueta: 'Días con restricción',
      valor: diasRestringidos.size,
      nota: `${prohibiciones} ${prohibiciones === 1 ? 'prohibición' : 'prohibiciones'}`,
      detalle: nombresProhibicion.length > 0 ? listaConY(nombresProhibicion) : nombreMes(hoy),
    },
  ]
}

/** «A», «A y B» o «A, B y C». */
export function listaConY(elementos: string[]): string {
  return elementos.length <= 1 ? (elementos[0] ?? '') : `${elementos.slice(0, -1).join(', ')} y ${elementos.at(-1)}`
}

function esTipoConocido(tipo: string): boolean {
  return tipo === 'FrecuenciaProxima' || tipo === 'DuracionExcedida' || tipo === 'DuracionProxima'
}

/** «08/10», como en Figma. */
export function fechaNumerica(fecha: FechaIso): string {
  return `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}`
}

/** «05 nov.». */
export function fechaCorta(fecha: FechaIso): string {
  return `${fecha.slice(8, 10)} ${MESES_CORTOS[Number(fecha.slice(5, 7)) - 1]}`
}

/** Mes y día de la caja de fecha de un ciclo: `{ mes: 'NOV', dia: '03' }`. */
export function cajaFecha(fecha: FechaIso): { mes: string; dia: string } {
  return { mes: MESES_CORTOS[Number(fecha.slice(5, 7)) - 1].replace('.', '').toUpperCase(), dia: fecha.slice(8, 10) }
}

/** «jue. 05 nov.» para un día, o «23 al 28 nov.» para un periodo. */
export function periodoRestriccion(inicio: FechaIso, fin: FechaIso): string {
  if (inicio === fin) return `${DIAS_SEMANA[aFecha(inicio).getUTCDay()]} ${fechaCorta(inicio)}`
  if (inicio.slice(0, 7) === fin.slice(0, 7)) return `${inicio.slice(8, 10)} al ${fechaCorta(fin)}`
  return `${fechaCorta(inicio)} al ${fechaCorta(fin)}`
}

export type AccionAtencion = 'programar' | 'verCiclo' | 'configurar'

export interface ElementoAtencion {
  clave: string
  tono: 'aviso' | 'error' | 'info'
  icono: NombreIconoFigma
  titulo: string
  detalle: string
  accion: AccionAtencion
  servicioId: number
  programacionId: number | null
}

/**
 * Bandeja «Necesita atención»: alertas de `GET alertas/` más los servicios periódicos sin duración, que no se
 * pueden programar. Primero lo vencido o excedido; los tipos desconocidos no se pintan.
 */
export function elementosAtencion(
  alertas: AlertaPlanificacion[],
  servicios: ServicioPeriodico[],
  programaciones: Programacion[] = [],
): ElementoAtencion[] {
  const elementos: ElementoAtencion[] = []
  // «Último ciclo: 08/10» (fin real del último completado) y «En curso desde el 21/10», como en Figma.
  const ultimoCiclo = (servicioId: number) =>
    programaciones
      .filter((p) => p.tipo_servicio_id === servicioId && p.estado === 'Completada')
      .map((p) => p.fecha_fin_real ?? p.fecha_fin_prevista)
      .sort()
      .at(-1)
  const enCursoDesde = (programacionId: number | null) => {
    const ciclo = programaciones.find((p) => p.id === programacionId)
    return ciclo ? `En curso desde el ${fechaNumerica(ciclo.fecha_inicio_real ?? ciclo.fecha_inicio_prevista)}` : 'Ciclo en curso'
  }
  for (const alerta of alertas) {
    const base = { servicioId: alerta.servicio_id, programacionId: alerta.programacion_id }
    if (alerta.tipo === 'FrecuenciaProxima') {
      const vencida = alerta.dias < 0
      elementos.push({
        ...base,
        clave: `frecuencia-${alerta.servicio_id}`,
        tono: vencida ? 'error' : 'aviso',
        icono: 'triangle-alert',
        titulo: vencida
          ? `${alerta.servicio} · frecuencia máxima superada hace ${dias(-alerta.dias)}`
          : `${alerta.servicio} · ${alerta.dias === 1 ? 'falta' : 'faltan'} ${dias(alerta.dias)} para la frecuencia máxima`,
        detalle: ultimoCiclo(alerta.servicio_id) ? `Último ciclo: ${fechaNumerica(ultimoCiclo(alerta.servicio_id) ?? '')}` : 'Sin ciclos anteriores',
        accion: 'programar',
      })
    } else if (alerta.tipo === 'DuracionExcedida') {
      elementos.push({
        ...base,
        clave: `duracion-${alerta.programacion_id ?? alerta.servicio_id}`,
        tono: 'error',
        icono: 'circle-x',
        titulo: `${alerta.servicio} · duración excedida en ${dias(alerta.dias)}`,
        detalle: enCursoDesde(alerta.programacion_id),
        accion: 'verCiclo',
      })
    } else if (alerta.tipo === 'DuracionProxima') {
      elementos.push({
        ...base,
        clave: `duracion-proxima-${alerta.programacion_id ?? alerta.servicio_id}`,
        tono: 'aviso',
        icono: 'triangle-alert',
        titulo: `${alerta.servicio} · ${alerta.dias === 1 ? 'queda' : 'quedan'} ${dias(alerta.dias)} de su duración máxima`,
        detalle: enCursoDesde(alerta.programacion_id),
        accion: 'verCiclo',
      })
    }
  }
  for (const servicio of servicios) {
    if (servicio.duracion) continue
    elementos.push({
      clave: `sin-duracion-${servicio.id}`,
      tono: 'info',
      icono: 'info',
      titulo: `${servicio.nombre} · sin duración configurada`,
      detalle: 'Necesaria para programar',
      accion: 'configurar',
      servicioId: servicio.id,
      programacionId: null,
    })
  }
  const orden = { error: 0, aviso: 1, info: 2 }
  return elementos.sort((a, b) => orden[a.tono] - orden[b.tono])
}

/** Ciclos programados o en curso que empiezan o siguen en los próximos 14 días, por fecha de inicio. */
export function proximosCiclos(hoy: FechaIso, programaciones: Programacion[]): Programacion[] {
  const hasta = sumarDias(hoy, DIAS_PROXIMOS)
  return programaciones
    .filter((p) => (p.estado === 'Programada' || p.estado === 'EnCurso') && seSolapa(p.fecha_inicio_prevista, p.fecha_fin_prevista, hoy, hasta))
    .sort((a, b) => a.fecha_inicio_prevista.localeCompare(b.fecha_inicio_prevista) || a.id - b.id)
}

const DIAS_SEMANA_FIGMA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

/** «Jue 19», como en Figma (sin mes). */
export function diaFigma(fecha: FechaIso): string {
  return `${DIAS_SEMANA_FIGMA[aFecha(fecha).getUTCDay()]} ${fecha.slice(8, 10)}`
}

/** «Lun 02» para un día y «16 al 19» para un periodo del mismo mes, como en Figma; de un mes a otro, con mes. */
export function periodoFigma(inicio: FechaIso, fin: FechaIso): string {
  if (inicio === fin) return diaFigma(inicio)
  if (inicio.slice(0, 7) === fin.slice(0, 7)) return `${inicio.slice(8, 10)} al ${fin.slice(8, 10)}`
  return `${fechaCorta(inicio)} al ${fechaCorta(fin)}`
}

export interface RestriccionProxima {
  clave: string
  /** «Jue 05 y 12», «Sáb 07» o «23 al 28», como en Figma (sin mes). */
  fechas: string
  tipo: string
  efecto: EfectoRestriccion
}

/** Texto de las fechas de una restricción o de una serie: con un solo día de la semana, se nombra una vez. */
function textoFechasRestriccion(grupo: Restriccion[]): string {
  const [primera] = grupo
  if (grupo.length === 1 && primera.fecha_inicio !== primera.fecha_fin) return `${primera.fecha_inicio.slice(8, 10)} al ${primera.fecha_fin.slice(8, 10)}`
  const diasSemana = new Set(grupo.map((r) => aFecha(r.fecha_inicio).getUTCDay()))
  const numeros = listaConY(grupo.map((r) => r.fecha_inicio.slice(8, 10)))
  return diasSemana.size === 1 ? `${DIAS_SEMANA_FIGMA[aFecha(primera.fecha_inicio).getUTCDay()]} ${numeros}` : numeros
}

/** Las restricciones próximas, con las fechas de una misma serie en una sola fila. */
export function restriccionesAgrupadas(hoy: FechaIso, restricciones: Restriccion[]): RestriccionProxima[] {
  const grupos = new Map<string, Restriccion[]>()
  for (const r of restriccionesProximas(hoy, restricciones)) {
    const clave = r.serie ?? `suelta-${r.id}`
    grupos.set(clave, [...(grupos.get(clave) ?? []), r])
  }
  return [...grupos.entries()].map(([clave, grupo]) => ({ clave, fechas: textoFechasRestriccion(grupo), tipo: grupo[0].tipo, efecto: grupo[0].efecto }))
}

/** Restricciones que siguen vigentes hoy o empiezan en los próximos 30 días, por fecha de inicio. */
export function restriccionesProximas(hoy: FechaIso, restricciones: Restriccion[]): Restriccion[] {
  const hasta = sumarDias(hoy, DIAS_RESTRICCIONES)
  return restricciones
    .filter((r) => seSolapa(r.fecha_inicio, r.fecha_fin, hoy, hasta))
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio) || a.id - b.id)
}
