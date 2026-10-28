/**
 * Lógica pura de los reportes de gestión del MOD-06 (RF-REP-001, RF-REP-005 y RF-REP-007): listas de valores
 * del contrato, conversión de los filtros de la URL y formato de los valores que llegan como texto.
 *
 * No valida estados ni modalidades: si la URL trae un valor que el back-end no acepta, el back-end responde
 * 400 con el mensaje en el campo y la página lo muestra.
 */
import type { ClaveIndicadorPanel, ConsultaGestion, ResultadoIndicador, TipoAtencion } from '../types/reportesGestion'
import type { Modalidad } from '../types/reportes'
import { formatearNumero } from './formato'

/** Orden del CU-MOD06-001 (paso 4); el back-end devuelve el mismo (`PanelService.ORDEN`). */
export const CLAVES_INDICADOR: readonly ClaveIndicadorPanel[] = [
  'actividades-por-estado',
  'distribucion-operarios',
  'atenciones-por-espacio',
  'consumo-materiales',
  'cumplimiento-tercerizados',
]

/** `true` si el texto es la clave de un indicador del panel (por ejemplo, el parámetro de la ruta). */
export function esClaveIndicador(valor: string | undefined): valor is ClaveIndicadorPanel {
  return valor !== undefined && (CLAVES_INDICADOR as readonly string[]).includes(valor)
}

/** Estados que acepta el filtro del panel (`PanelService.ESTADOS` del back-end). */
export const ESTADOS_FILTRO_PANEL: readonly string[] = [
  'Requerimiento registrado',
  'OC referenciada',
  'En ejecución',
  'Ejecutado pendiente de reporte',
  'Reporte adjunto',
  'Observado',
  'Conforme / cerrado',
]

/** Estados que acepta el filtro del mapa: solo atenciones realizadas (`ESTADOS_REALIZADOS` del back-end). */
export const ESTADOS_FILTRO_MAPA: readonly string[] = [
  'Ejecutado pendiente de reporte',
  'Reporte adjunto',
  'Observado',
  'Conforme / cerrado',
]

/** Tipos de atención del mapa, en el orden del back-end (`TiposAtencion.TODOS`). */
export const TIPOS_ATENCION: readonly TipoAtencion[] = ['Mantenimiento', 'Poda', 'Fitosanitario']

/** Texto decimal de la API (punto decimal): «12.50» → 12.5. Vacío, null o no numérico → null. */
export function numeroDeDecimal(valor: string | number | null | undefined): number | null {
  if (valor === null || valor === undefined) return null
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null
  const texto = valor.trim()
  if (!/^-?\d+(\.\d+)?$/.test(texto)) return null
  return Number(texto)
}

/** Valor de la tarjeta de un indicador ya formateado («66,67», «5», «1 240»), o null si no hay datos. */
export function valorTarjeta(resultado: ResultadoIndicador): string | null {
  if (resultado.sin_datos || resultado.valor === null) return null
  return formatearNumero(numeroDeDecimal(resultado.valor))
}

/** Filtros del panel y del mapa tal como están en la URL. */
export interface FiltrosGestionUrl {
  desde: string
  hasta: string
  area_verde_id: string
  tipo_servicio_id: string
  estado: string
  modalidad: string
}

/** Entero positivo de un texto de la URL; si no lo es, `undefined` (no se envía). */
export function enteroPositivo(texto: string): number | undefined {
  if (!/^\d{1,9}$/.test(texto)) return undefined
  const valor = Number(texto)
  return valor >= 1 ? valor : undefined
}

/** Filtros de la URL (texto) → consulta tipada de la API. Omite los vacíos y los ids no válidos. */
export function aConsultaGestion(filtros: FiltrosGestionUrl): ConsultaGestion {
  const consulta: ConsultaGestion = { desde: filtros.desde, hasta: filtros.hasta }
  const area = enteroPositivo(filtros.area_verde_id)
  if (area) consulta.area_verde_id = area
  const tipo = enteroPositivo(filtros.tipo_servicio_id)
  if (tipo) consulta.tipo_servicio_id = tipo
  if (filtros.estado) consulta.estado = filtros.estado
  if (filtros.modalidad) consulta.modalidad = filtros.modalidad as Modalidad
  return consulta
}

/** Une varias listas de notas sin repetir, en el orden de aparición. */
export function notasUnicas(...listas: string[][]): string[] {
  return [...new Set(listas.flat())]
}

/** Ruta del detalle con los filtros actuales (HU-MOD06-001, criterio 3). Quita la página. */
export function rutaDetalleConFiltros(rutaDetalle: string, busqueda: string): string {
  const parametros = new URLSearchParams(busqueda)
  parametros.delete('page')
  const texto = parametros.toString()
  return texto ? `${rutaDetalle}?${texto}` : rutaDetalle
}
