/**
 * Lógica pura de la exportación de reportes (RF-REP-009): qué filtros se envían según el tipo, su validación, el
 * resumen de lo que se va a exportar (criterio 2) y los límites por formato (A1).
 */
import { validarPeriodo } from '@/design-system/validacionPeriodo'
import type { ErrorApi } from '../services/api/cliente'
import type {
  FiltroExportable,
  FormatoSalida,
  ParametrosExportacion,
  ReporteGenerado,
  TipoExportable,
} from '../types/exportaciones'
import type { Modalidad } from '../types/reportes'
import { textoModalidad } from './estados'
import { formatearFecha, formatearMes } from './formato'
import { enteroPositivo, validarMes } from './reportesGestion'

/** Campos del formulario, tal como viven en la URL (texto; vacío = sin filtro). */
export type CampoExportacion =
  | 'desde'
  | 'hasta'
  | 'mes'
  | 'tipo_servicio_id'
  | 'proveedor_id'
  | 'area_verde_id'
  | 'modalidad'

export type FiltrosExportacion = Record<CampoExportacion, string>

/** Texto de interfaz de cada formato. */
export const TEXTO_FORMATO: Record<FormatoSalida, string> = { PDF: 'PDF', Excel: 'Excel (.xlsx)' }

const FILTROS_ID: readonly ('tipo_servicio_id' | 'proveedor_id' | 'area_verde_id')[] = [
  'tipo_servicio_id',
  'proveedor_id',
  'area_verde_id',
]

const MODALIDADES: readonly Modalidad[] = ['PersonalPropio', 'Tercerizado']

function esModalidad(valor: string): valor is Modalidad {
  return MODALIDADES.some((m) => m === valor)
}

/** Solo los filtros que admite el tipo, sin vacíos y con los ids como números. */
export function parametrosParaTipo(tipo: TipoExportable, filtros: FiltrosExportacion): ParametrosExportacion {
  const admite = (filtro: FiltroExportable) => tipo.filtros.includes(filtro)
  const parametros: ParametrosExportacion = {}
  if (admite('periodo')) {
    if (filtros.desde) parametros.desde = filtros.desde
    if (filtros.hasta) parametros.hasta = filtros.hasta
  }
  if (admite('mes') && filtros.mes) parametros.mes = filtros.mes
  for (const campo of FILTROS_ID) {
    const valor = enteroPositivo(filtros[campo])
    if (admite(campo) && valor !== undefined) parametros[campo] = valor
  }
  if (admite('modalidad') && filtros.modalidad) parametros.modalidad = filtros.modalidad
  return parametros
}

/** Errores de los campos obligatorios del tipo (periodo o mes), antes de llamar a la API. */
export function validarExportacion(
  tipo: TipoExportable,
  filtros: FiltrosExportacion,
): Partial<Record<CampoExportacion, string>> {
  const errores: Partial<Record<CampoExportacion, string>> = {}
  if (tipo.filtros.includes('periodo')) Object.assign(errores, validarPeriodo(filtros.desde, filtros.hasta))
  if (tipo.filtros.includes('mes')) {
    const errorMes = validarMes(filtros.mes)
    if (errorMes) errores.mes = errorMes
  }
  return errores
}

/** Nombres de los catálogos para el resumen (id → nombre). */
export interface NombresCatalogo {
  servicios: ReadonlyMap<number, string>
  proveedores: ReadonlyMap<number, string>
  espacios: ReadonlyMap<number, string>
}

/** Texto del periodo de unos parámetros, o `null` si no tienen. */
export function textoPeriodo(parametros: ParametrosExportacion): string | null {
  if (parametros.mes) return formatearMes(parametros.mes)
  if (parametros.desde && parametros.hasta)
    return `Del ${formatearFecha(parametros.desde)} al ${formatearFecha(parametros.hasta)}`
  return null
}

/** «Reporte general de gestión · Octubre de 2026 · Servicio: Corte de césped · PDF» (criterio 2). */
export function resumenExportacion(
  tipo: TipoExportable,
  parametros: ParametrosExportacion,
  catalogos: NombresCatalogo,
  formato?: FormatoSalida,
): string {
  const nombre = (mapa: ReadonlyMap<number, string>, id: number) => mapa.get(id) ?? `n.º ${id}`
  const partes = [
    tipo.nombre,
    textoPeriodo(parametros),
    parametros.tipo_servicio_id !== undefined &&
      `Servicio: ${nombre(catalogos.servicios, parametros.tipo_servicio_id)}`,
    parametros.proveedor_id !== undefined && `Proveedor: ${nombre(catalogos.proveedores, parametros.proveedor_id)}`,
    parametros.area_verde_id !== undefined && `Espacio: ${nombre(catalogos.espacios, parametros.area_verde_id)}`,
    parametros.modalidad &&
      `Modalidad: ${esModalidad(parametros.modalidad) ? textoModalidad(parametros.modalidad) : parametros.modalidad}`,
    formato && TEXTO_FORMATO[formato],
  ]
  return partes.filter(Boolean).join(' · ')
}

/** Formatos que se pueden elegir (ninguno si el tipo no está disponible). */
export function formatosPermitidos(tipo: TipoExportable): FormatoSalida[] {
  return tipo.disponible ? tipo.formatos : []
}

/** `true` si se sabe que las filas superan el límite del formato (A1). Sin filas conocidas, `false`. */
export function superaLimite(tipo: TipoExportable, formato: FormatoSalida, filas?: number): boolean {
  const limite = tipo.limite_filas?.[formato]
  return limite !== undefined && filas !== undefined && filas > limite
}

/** Otro formato permitido del tipo (para «Cambiar a Excel» tras un volumen excedido), o `null`. */
export function formatoAlternativo(tipo: TipoExportable, formato: FormatoSalida): FormatoSalida | null {
  return formatosPermitidos(tipo).find((f) => f !== formato) ?? null
}

/** Nombre del CSV de la descarga simulada: `<tipo>-<periodo>-simulado.csv`. */
export function nombreArchivoSimulado(reporte: ReporteGenerado): string {
  const { mes, desde, hasta } = reporte.parametros
  const periodo = mes ?? (desde && hasta ? `${desde}_${hasta}` : 'sin-periodo')
  return `${reporte.tipo}-${periodo}-simulado.csv`
}

/**
 * Cómo se presenta un error al generar:
 * - `volumen`: A1, aviso con «Cambiar a …» y «Acotar filtros»;
 * - `sin-datos`: A2, aviso informativo;
 * - `campos`: 400 con errores por campo, junto a cada campo;
 * - `general`: E1 (y 403), aviso de error con «Reintentar».
 */
export type ClaseErrorExportacion = 'volumen' | 'sin-datos' | 'campos' | 'general'

export function clasificarErrorExportacion(error: ErrorApi): ClaseErrorExportacion {
  if (error.codigo === 'volumen-excedido') return 'volumen'
  if (error.codigo === 'sin-datos') return 'sin-datos'
  if (error.estado === 400 && Object.keys(error.errores_campo).length > 0) return 'campos'
  return 'general'
}
