/**
 * Lógica pura del reporte por servicio tercerizado (RF-REP-008): filtros de la URL, textos de las tarjetas y
 * desgloses de los gráficos. Una sección `sin_datos` nunca se convierte en un cero.
 */
import type { Periodo } from '../types/comun'
import type {
  AvanceServicio,
  ConformidadServicio,
  ConsultaReporteServicio,
  FilaAtencionServicio,
  RendimientoServicio,
} from '../types/reportesGestion'
import { formatearNumero } from './formato'
import { hoyLima } from './instanteLima'
import { enteroPositivo, numeroDeDecimal } from './reportesGestion'

/** Estados de una atención ya ejecutada (con fin registrado). */
export const ESTADOS_EJECUTADOS: ReadonlySet<string> = new Set([
  'Ejecutado pendiente de reporte',
  'Reporte adjunto',
  'Observado',
  'Conforme / cerrado',
])

/** Estados de una atención aún sin iniciar. */
export const ESTADOS_PENDIENTES: ReadonlySet<string> = new Set(['Requerimiento registrado', 'OC referenciada'])

/** Del día 1 del mes en curso a hoy, en Lima (periodo predeterminado del reporte). */
export function mesEnCursoHastaHoy(ahora: Date = new Date()): Periodo {
  const hoy = hoyLima(ahora)
  return { desde: `${hoy.slice(0, 8)}01`, hasta: hoy }
}

/** Filtros del reporte tal como viven en la URL. */
export interface FiltrosUrlServicio {
  desde: string
  hasta: string
  tipo_servicio_id: string
  proveedor_id: string
}

/** Consulta de la API, o `null` sin servicio elegido (entonces no se consulta). */
export function consultaServicio(filtros: FiltrosUrlServicio): ConsultaReporteServicio | null {
  const tipo = enteroPositivo(filtros.tipo_servicio_id)
  if (tipo === undefined) return null
  return { desde: filtros.desde, hasta: filtros.hasta, tipo_servicio_id: tipo, proveedor_id: enteroPositivo(filtros.proveedor_id) }
}

/** Clave de `useConsulta`: `null` sin servicio elegido. */
export function claveConsultaServicio(consulta: ConsultaReporteServicio | null): string | null {
  if (!consulta) return null
  return `servicio|${consulta.tipo_servicio_id}|${consulta.proveedor_id ?? ''}|${consulta.desde}|${consulta.hasta}`
}

function plural(cantidad: number, singular: string, varios: string): string {
  return `${formatearNumero(cantidad)} ${cantidad === 1 ? singular : varios}`
}

/** «X de Y atenciones» ejecutadas, o `null` si no hay datos. */
export function textoAvance(avance: AvanceServicio): string | null {
  if (avance.sin_datos) return null
  const total = avance.programadas + avance.extraordinarias
  return `${formatearNumero(avance.ejecutadas)} de ${plural(total, 'atención', 'atenciones')}`
}

/** «X conformes · Y observadas», o `null` si no hay datos. */
export function resumenConformidad(conformidad: ConformidadServicio): string | null {
  if (conformidad.sin_datos) return null
  return `${plural(conformidad.conformes, 'conforme', 'conformes')} · ${plural(conformidad.observadas, 'observada', 'observadas')}`
}

/** Valor de la tarjeta de rendimiento con su unidad («12,5 m²/h»), o «Sin datos». */
export function tituloTarjetaRendimiento(rendimiento: RendimientoServicio): string {
  const valor = numeroDeDecimal(rendimiento.rendimiento_por_hora)
  if (rendimiento.sin_datos || valor === null) return 'Sin datos'
  return `${formatearNumero(valor)} ${rendimiento.unidad_rendimiento ?? ''}`.trim()
}

/** Las atenciones, o solo las que no tienen evidencia adjunta (CU-MOD06-002 A2). */
export function filtrarSinEvidencia(filas: FilaAtencionServicio[], soloSinEvidencia: boolean): FilaAtencionServicio[] {
  return soloSinEvidencia ? filas.filter((f) => !f.con_evidencia) : filas
}

/** Partes del avance que se dibujan como barras. */
export type ParteAvance = 'programadas' | 'extraordinarias' | 'ejecutadas' | 'en_ejecucion' | 'pendientes'

export const PARTES_AVANCE: readonly { clave: ParteAvance; texto: string }[] = [
  { clave: 'programadas', texto: 'Programadas' },
  { clave: 'extraordinarias', texto: 'Extraordinarias' },
  { clave: 'ejecutadas', texto: 'Ejecutadas' },
  { clave: 'en_ejecucion', texto: 'En ejecución' },
  { clave: 'pendientes', texto: 'Pendientes de inicio' },
]

/** Atenciones de una parte del avance (los registros de origen de su barra). */
export function atencionesDeParte(filas: FilaAtencionServicio[], parte: ParteAvance): FilaAtencionServicio[] {
  switch (parte) {
    case 'programadas':
      return filas.filter((f) => f.clase === 'Programada')
    case 'extraordinarias':
      return filas.filter((f) => f.clase === 'Extraordinaria')
    case 'ejecutadas':
      return filas.filter((f) => ESTADOS_EJECUTADOS.has(f.estado))
    case 'en_ejecucion':
      return filas.filter((f) => f.estado === 'En ejecución')
    case 'pendientes':
      return filas.filter((f) => ESTADOS_PENDIENTES.has(f.estado))
  }
}

/** Atenciones en las que se atendió una especie o plaga. */
export function atencionesDeElemento(filas: FilaAtencionServicio[], nombre: string): FilaAtencionServicio[] {
  return filas.filter((f) => f.especies_plagas.includes(nombre))
}

/** Metrado ejecutado frente al previsto, o `null` si falta alguno. */
export function metradoAvance(avance: AvanceServicio): { ejecutado: number; previsto: number; unidad: string } | null {
  const ejecutado = numeroDeDecimal(avance.metrado_ejecutado)
  const previsto = numeroDeDecimal(avance.metrado_previsto)
  if (avance.sin_datos || ejecutado === null || previsto === null || previsto <= 0) return null
  return { ejecutado, previsto, unidad: avance.unidad_metrado ?? '' }
}

/** Partes del desglose de conformidad. */
export type ParteConformidad = 'conformes' | 'observadas' | 'pendientes_de_revision' | 'sin_reporte_proveedor' | 'subsanaciones_abiertas'

export const PARTES_CONFORMIDAD: readonly { clave: ParteConformidad; texto: string; tono: 'exito' | 'advertencia' | 'info' | 'neutral' }[] = [
  { clave: 'conformes', texto: 'Conformes', tono: 'exito' },
  { clave: 'observadas', texto: 'Observadas', tono: 'advertencia' },
  { clave: 'pendientes_de_revision', texto: 'Pendientes de revisión', tono: 'info' },
  { clave: 'sin_reporte_proveedor', texto: 'Sin reporte del proveedor', tono: 'neutral' },
  { clave: 'subsanaciones_abiertas', texto: 'Subsanaciones abiertas', tono: 'advertencia' },
]

/**
 * Atenciones de una parte de la conformidad.
 * SUPUESTO (pendiente de confirmar con el backend): una subsanación abierta corresponde a una atención «Observado».
 */
export function atencionesDeConformidad(filas: FilaAtencionServicio[], parte: ParteConformidad): FilaAtencionServicio[] {
  switch (parte) {
    case 'conformes':
      return filas.filter((f) => f.conformidad === 'Conforme')
    case 'observadas':
      return filas.filter((f) => f.conformidad === 'Observada')
    case 'pendientes_de_revision':
      return filas.filter((f) => f.estado === 'Reporte adjunto')
    case 'sin_reporte_proveedor':
      return filas.filter((f) => f.estado === 'Ejecutado pendiente de reporte')
    case 'subsanaciones_abiertas':
      return filas.filter((f) => f.estado === 'Observado')
  }
}
