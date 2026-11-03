/**
 * Lógica pura de RF-IA-003 (planificación asistida del cronograma): agrupación por semana, coincidencias con
 * prohibiciones (RI-25), validación y resumen de las decisiones, el texto de los cambios del usuario y la cuadrícula
 * del calendario. La IA solo propone: nada se programa hasta confirmar.
 */
import type { NombreIcono } from '../components/ui/Icono'
import type { Tono } from '../components/ui/tonos'
import type { FechaIso, Periodo } from '../types/comun'
import type { AccionDecision } from '../types/ia'
import type {
  CuerpoValidacionCronograma,
  PropuestaCronograma,
  RecursosSugeridos,
  RestriccionConsiderada,
  ValoresCronograma,
} from '../types/cronogramaIa'
import { formatearFecha, formatearNumero } from './formato'
import { hoyLima } from './instanteLima'

const MS_DIA = 86_400_000

/** «20 oct.» a partir de una fecha ISO. */
export function fechaCorta(fecha: FechaIso): string {
  return formatearFecha(fecha).split(' ').slice(0, 2).join(' ')
}

/** Insignia de una restricción considerada, como en Planificación: nunca solo color, siempre texto e icono. */
export const PRESENTACION_RESTRICCION: Record<RestriccionConsiderada['tipo'], { texto: string; tono: Tono; icono: NombreIcono }> = {
  Prohibicion: { texto: 'Prohibición', tono: 'error', icono: 'aspa' },
  Advertencia: { texto: 'Advertencia', tono: 'advertencia', icono: 'triangulo' },
}

export function aDia(fecha: FechaIso): number {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  return Date.UTC(anio, mes - 1, dia)
}

export function deDia(ms: number): FechaIso {
  return new Date(ms).toISOString().slice(0, 10)
}

/** Lunes de la semana de una fecha (calendario, sin zona: las fechas ya son de Lima). */
export function lunesDe(fecha: FechaIso): FechaIso {
  const dia = aDia(fecha)
  const diaSemana = (new Date(dia).getUTCDay() + 6) % 7 // 0 = lunes
  return deDia(dia - diaSemana * MS_DIA)
}

export function sumarDias(fecha: FechaIso, dias: number): FechaIso {
  return deDia(aDia(fecha) + dias * MS_DIA)
}

/** «02 nov.–08 nov.» (o un solo día). */
export function textoPeriodoCorto(desde: FechaIso, hasta: FechaIso): string {
  return desde === hasta ? fechaCorta(desde) : `${fechaCorta(desde)}–${fechaCorta(hasta)}`
}

export interface SemanaCronograma {
  lunes: FechaIso
  domingo: FechaIso
  titulo: string
  propuestas: PropuestaCronograma[]
}

/** Propuestas agrupadas por semana (de lunes a domingo) según su fecha de inicio, en orden. */
export function agruparPorSemana(propuestas: PropuestaCronograma[]): SemanaCronograma[] {
  const semanas = new Map<FechaIso, PropuestaCronograma[]>()
  const ordenadas = [...propuestas].sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio) || a.actividad.localeCompare(b.actividad, 'es'))
  for (const p of ordenadas) {
    const lunes = lunesDe(p.fecha_inicio)
    semanas.set(lunes, [...(semanas.get(lunes) ?? []), p])
  }
  return [...semanas.entries()].map(([lunes, lista]) => {
    const domingo = sumarDias(lunes, 6)
    return { lunes, domingo, titulo: `Semana del ${fechaCorta(lunes)} al ${fechaCorta(domingo)}`, propuestas: lista }
  })
}

/** Prohibiciones que coinciden con la propuesta. */
export function prohibicionesDe(propuesta: Pick<PropuestaCronograma, 'coincidencias'>): RestriccionConsiderada[] {
  return propuesta.coincidencias.filter((c) => c.tipo === 'Prohibicion')
}

export function coincideConProhibicion(propuesta: Pick<PropuestaCronograma, 'coincidencias'>): boolean {
  return prohibicionesDe(propuesta).length > 0
}

/** Decisión en curso de una propuesta. */
export interface DecisionEnCursoCronograma {
  accion?: AccionDecision
  /** Valores del usuario al modificar (A1). */
  valores: ValoresCronograma | null
  /** Casilla de RI-25. */
  confirma: boolean
}

export const MENSAJES_CRONOGRAMA = {
  sinDecision: 'Elige aceptar, modificar o descartar',
  sinValores: 'Indica los cambios con «Modificar»',
  sinConfirmar: 'Confirma que quieres programar pese a la prohibición, o descarta la propuesta',
} as const

/** Errores por clave: sin decisión, modificación sin valores o prohibición sin confirmar (RI-25). */
export function validarDecisiones(
  propuestas: PropuestaCronograma[],
  decisiones: Record<string, DecisionEnCursoCronograma | undefined>,
): Record<string, string> {
  const errores: Record<string, string> = {}
  for (const p of propuestas) {
    const d = decisiones[p.clave]
    if (!d?.accion) errores[p.clave] = MENSAJES_CRONOGRAMA.sinDecision
    else if (d.accion === 'corregir' && !d.valores) errores[p.clave] = MENSAJES_CRONOGRAMA.sinValores
    else if (d.accion !== 'descartar' && coincideConProhibicion(p) && !d.confirma) errores[p.clave] = MENSAJES_CRONOGRAMA.sinConfirmar
  }
  return errores
}

/** Cuerpo de `validar/`, o `null` si alguna decisión no es válida. Solo se envían valores al modificar. */
export function cuerpoConfirmacion(
  propuestas: PropuestaCronograma[],
  decisiones: Record<string, DecisionEnCursoCronograma | undefined>,
): CuerpoValidacionCronograma | null {
  if (Object.keys(validarDecisiones(propuestas, decisiones)).length > 0) return null
  const porPropuesta: CuerpoValidacionCronograma['por_propuesta'] = {}
  for (const p of propuestas) {
    const d = decisiones[p.clave]
    if (!d?.accion) return null
    porPropuesta[p.clave] = {
      accion: d.accion,
      valores_finales: d.accion === 'corregir' ? d.valores : null,
      confirma_restriccion: d.accion !== 'descartar' && coincideConProhibicion(p) && d.confirma,
    }
  }
  return { por_propuesta: porPropuesta }
}

/** Recuento para la confirmación: se programan las aceptadas y las modificadas. */
export function resumenConfirmacion(decisiones: (DecisionEnCursoCronograma | { accion?: AccionDecision } | undefined)[]): {
  aceptadas: number
  modificadas: number
  descartadas: number
  programar: number
} {
  const r = { aceptadas: 0, modificadas: 0, descartadas: 0, programar: 0 }
  for (const d of decisiones) {
    if (d?.accion === 'aceptar') r.aceptadas += 1
    else if (d?.accion === 'corregir') r.modificadas += 1
    else if (d?.accion === 'descartar') r.descartadas += 1
  }
  r.programar = r.aceptadas + r.modificadas
  return r
}

/** «Se programarán 9 actividades: 7 aceptadas y 2 modificadas. 3 descartadas.» */
export function textoResumenConfirmacion(r: ReturnType<typeof resumenConfirmacion>): string {
  const actividades = r.programar === 1 ? '1 actividad' : `${formatearNumero(r.programar)} actividades`
  return `Se programarán ${actividades}: ${formatearNumero(r.aceptadas)} aceptadas y ${formatearNumero(r.modificadas)} modificadas. ${formatearNumero(r.descartadas)} descartadas.`
}

/** Un recurso de la propuesta (para elegir otro al modificar). */
export interface RecursoOpcion {
  id: number
  nombre: string
}

/** Cuadrillas y proveedores que aparecen en la propuesta, sin repetir y por nombre. */
export function recursosDisponibles(propuestas: PropuestaCronograma[]): { cuadrillas: RecursoOpcion[]; proveedores: RecursoOpcion[] } {
  const cuadrillas = new Map<number, string>()
  const proveedores = new Map<number, string>()
  for (const { recursos: r } of propuestas) {
    if (r.cuadrilla_id !== null) cuadrillas.set(r.cuadrilla_id, r.cuadrilla ?? `Cuadrilla n.º ${r.cuadrilla_id}`)
    if (r.proveedor_id !== null) proveedores.set(r.proveedor_id, r.proveedor ?? `Proveedor n.º ${r.proveedor_id}`)
  }
  const lista = (m: Map<number, string>) => [...m].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  return { cuadrillas: lista(cuadrillas), proveedores: lista(proveedores) }
}

/** «Cuadrilla 1 (demo) · 4 operarios» o el proveedor. */
export function textoRecursos(r: RecursosSugeridos): string {
  const responsable = r.modalidad === 'PersonalPropio' ? r.cuadrilla : r.proveedor
  const operarios = r.operarios === null ? null : `${formatearNumero(r.operarios)} ${r.operarios === 1 ? 'operario' : 'operarios'}`
  return [responsable ?? 'Sin responsable', operarios].filter(Boolean).join(' · ')
}

/** Valores de partida del diálogo «Modificar»: los de la propuesta. */
export function valoresDePropuesta(p: PropuestaCronograma): ValoresCronograma {
  return {
    fecha_inicio: p.fecha_inicio,
    fecha_fin: p.fecha_fin,
    area_verde_id: p.area_verde_id,
    cuadrilla_id: p.recursos.cuadrilla_id,
    proveedor_id: p.recursos.proveedor_id,
    operarios: p.recursos.operarios,
  }
}

/** «04 nov. → 06 nov.; Cuadrilla 1 → Cuadrilla 2»: solo lo que cambió. */
export function textoCambios(
  propuesta: PropuestaCronograma,
  valores: ValoresCronograma,
  nombres: { espacio: (id: number | null) => string; cuadrilla: (id: number | null) => string; proveedor: (id: number | null) => string },
): string {
  const cambios: string[] = []
  const antes = valoresDePropuesta(propuesta)
  if (antes.fecha_inicio !== valores.fecha_inicio || antes.fecha_fin !== valores.fecha_fin) {
    cambios.push(`${textoPeriodoCorto(antes.fecha_inicio, antes.fecha_fin)} → ${textoPeriodoCorto(valores.fecha_inicio, valores.fecha_fin)}`)
  }
  if (antes.area_verde_id !== valores.area_verde_id) cambios.push(`${propuesta.ubicacion} → ${nombres.espacio(valores.area_verde_id)}`)
  if (antes.cuadrilla_id !== valores.cuadrilla_id) cambios.push(`${nombres.cuadrilla(antes.cuadrilla_id)} → ${nombres.cuadrilla(valores.cuadrilla_id)}`)
  if (antes.proveedor_id !== valores.proveedor_id) cambios.push(`${nombres.proveedor(antes.proveedor_id)} → ${nombres.proveedor(valores.proveedor_id)}`)
  if (antes.operarios !== valores.operarios) {
    cambios.push(`${formatearNumero(antes.operarios)} → ${formatearNumero(valores.operarios)} operarios`)
  }
  return cambios.join('; ') || 'Sin cambios'
}

/** El mes siguiente completo, en Lima (periodo por defecto de una propuesta). */
export function mesSiguiente(ahora: Date = new Date()): Periodo {
  const [anio, mes] = hoyLima(ahora).split('-').map(Number)
  const inicio = deDia(Date.UTC(anio, mes, 1))
  return { desde: inicio, hasta: deDia(Date.UTC(anio, mes + 1, 0)) }
}

/** `true` si la fecha cae en el intervalo (incluidos los extremos). */
export function enIntervalo(fecha: FechaIso, desde: FechaIso, hasta: FechaIso): boolean {
  return fecha >= desde && fecha <= hasta
}

/** Id de la casilla de RI-25 de una propuesta (para llevar el foco desde el resumen de errores). */
export function idConfirmaRestriccion(clave: string): string {
  return `confirma-${clave}`
}

/** Fechas con las que se verá la propuesta: las modificadas por el usuario, si las hay. */
export function fechasEfectivas(
  propuesta: Pick<PropuestaCronograma, 'fecha_inicio' | 'fecha_fin'>,
  valores: ValoresCronograma | null | undefined,
): { desde: FechaIso; hasta: FechaIso } {
  return valores ? { desde: valores.fecha_inicio, hasta: valores.fecha_fin } : { desde: propuesta.fecha_inicio, hasta: propuesta.fecha_fin }
}

/** Programaciones existentes del mismo espacio que se cruzan en fechas con la propuesta. */
export function crucesConProgramado<P extends { area_verde_id: number | null; fecha_inicio: FechaIso; fecha_fin: FechaIso }>(
  rango: { area_verde_id: number | null; desde: FechaIso; hasta: FechaIso },
  existentes: P[],
): P[] {
  if (rango.area_verde_id === null) return []
  return existentes.filter((e) => e.area_verde_id === rango.area_verde_id && e.fecha_inicio <= rango.hasta && e.fecha_fin >= rango.desde)
}
