/**
 * Lógica pura de los reportes de gestión del MOD-06 (RF-REP-001, RF-REP-005 y RF-REP-007): listas de valores
 * del contrato, conversión de los filtros de la URL y formato de los valores que llegan como texto.
 *
 * No valida estados ni modalidades: si la URL trae un valor que el back-end no acepta, el back-end responde
 * 400 con el mensaje en el campo y la página lo muestra.
 */
import type { Tono } from '../components/ui/Badge'
import type {
  ClaveIndicadorPanel,
  ComparacionMes,
  ConsultaGestion,
  ResultadoIndicador,
  TipoAtencion,
} from '../types/reportesGestion'
import type { Modalidad } from '../types/reportes'
import { ESTADOS_ATENCION, insigniaEstado } from './estadosTercerizados'
import { formatearNumero } from './formato'
import { hoyLima } from './instanteLima'

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

/** Tono de los estados del ciclo que MOD-05 aún no implementa (Guía Web 5.6: observada en ámbar, conforme en verde). */
const TONO_ESTADO_POSTERIOR: Record<string, Tono> = {
  Observado: 'advertencia',
  'Conforme / cerrado': 'exito',
}

/**
 * Insignia del estado de una atención tercerizada. Reutiliza `insigniaEstado` de estadosTercerizados.ts para los
 * cinco estados implementados en MOD-05; «Observado» → advertencia y «Conforme / cerrado» → éxito (Guía 5.6:
 * observada en ámbar, conforme en verde; Tabla 2 del mockup), y cualquier otro → neutral con el texto tal cual.
 */
export function insigniaEstadoAtencion(estado: string): { texto: string; tono: Tono } {
  const conocido = ESTADOS_ATENCION.find((e) => e === estado)
  if (conocido) return insigniaEstado(conocido)
  return { texto: estado, tono: TONO_ESTADO_POSTERIOR[estado] ?? 'neutral' }
}

// --- RF-REP-005: material vegetal ------------------------------------------------------------------------------

/** Mismos textos que el back-end (`ErrorGestion.mensajeFalta("mes")` y `ParametrosGestion.MENSAJE_FORMATO_MES`). */
export const MENSAJES_MES = {
  falta: 'Indica el mes del reporte (mes), con el formato AAAA-MM',
  formato: 'Usa el formato AAAA-MM',
} as const

/** Mismo patrón que `ParametrosGestion.MES`: año de 4 cifras y mes 01..12. */
const PATRON_MES = /^[0-9]{4}-(0[1-9]|1[0-2])$/

/** Error del campo mes, o `undefined` si es válido. */
export function validarMes(mes: string): string | undefined {
  if (!mes.trim()) return MENSAJES_MES.falta
  return PATRON_MES.test(mes) ? undefined : MENSAJES_MES.formato
}

/** Mes actual en Lima (`AAAA-MM`). */
export function mesActualLima(ahora: Date = new Date()): string {
  return hoyLima(ahora).slice(0, 7)
}

export type MovimientoMaterial = 'Consumido' | 'Propagado' | 'Trasladado'

/** Fila plana de la comparación (CU-MOD05-029, paso 4): un mes, un tipo de movimiento, un material y una unidad. */
export interface FilaComparacion {
  mes: string
  movimiento: MovimientoMaterial
  tipo_material: string
  unidad: string
  cantidad: string
}

/** Filas de la comparación en el orden de los meses y, dentro de cada mes, consumido, propagado y trasladado. */
export function filasComparacion(comparacion: ComparacionMes[]): FilaComparacion[] {
  return comparacion.flatMap((mes) => {
    const grupos: [MovimientoMaterial, ComparacionMes['consumido']][] = [
      ['Consumido', mes.consumido],
      ['Propagado', mes.propagado],
      ['Trasladado', mes.trasladado],
    ]
    return grupos.flatMap(([movimiento, totales]) =>
      totales.map((t) => ({ mes: mes.mes, movimiento, tipo_material: t.tipo_material, unidad: t.unidad, cantidad: t.cantidad })),
    )
  })
}

/** Meses de la comparación sin movimientos (para avisarlo; nunca se muestran ceros). */
export function mesesSinDatos(comparacion: ComparacionMes[]): string[] {
  return comparacion.filter((m) => m.sin_datos).map((m) => m.mes)
}
