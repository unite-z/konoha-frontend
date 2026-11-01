/**
 * Registros del detalle de un indicador (RF-REP-001) para sus gráficos: se descargan todas las páginas del
 * back-end (25 por página) hasta un tope, y se agrupan según lo que elija la persona.
 */
import { obtenerDetalleIndicador } from '../../../services/api/reportesGestion'
import type {
  ClaveIndicadorPanel,
  ConsultaGestion,
  DetalleIndicadorPanel,
  FilaAtencionEspacio,
  FilaAtencionPeriodo,
  FilaMovimientoMaterial,
} from '../../../types/reportesGestion'
import { formatearFecha } from '../../../utils/formato'
import { numeroDeDecimal } from '../../../utils/reportesGestion'
import { TEXTO_SIN_ESPACIO } from './desglose'

/** Tope de registros que se descargan para los gráficos (40 páginas de 25). */
export const MAXIMO_REGISTROS = 1000
const POR_PAGINA = 25

/** Primera página del detalle con todos los registros descargados en `results`. */
export type DetalleCompleto<F> = DetalleIndicadorPanel<F> & {
  /** `false` si había más registros que el tope. */
  completo: boolean
}

export async function cargarRegistros<F>(
  clave: ClaveIndicadorPanel,
  consulta: ConsultaGestion,
  signal: AbortSignal,
  /** Tope de registros (por defecto, MAXIMO_REGISTROS; 25 para traer solo la primera página). */
  maximo = MAXIMO_REGISTROS,
): Promise<DetalleCompleto<F>> {
  const primera = await obtenerDetalleIndicador<F>(clave, consulta, undefined, signal)
  const filas = [...primera.results]
  const paginas = Math.min(Math.ceil(primera.count / POR_PAGINA), Math.ceil(maximo / POR_PAGINA))
  for (let pagina = 2; pagina <= paginas; pagina++) {
    const siguiente = await obtenerDetalleIndicador<F>(clave, consulta, String(pagina), signal)
    filas.push(...siguiente.results)
    if (!siguiente.next) break
  }
  return { ...primera, results: filas, completo: filas.length >= primera.count }
}

export interface GrupoRegistros<F> {
  clave: string
  texto: string
  valor: number
  filas: F[]
}

/** Formas de agrupar los registros de un indicador en su gráfico de resumen. */
export interface Agrupacion<F> {
  valor: string
  texto: string
  /** Columnas por fecha (en orden) en lugar de barras de mayor a menor. */
  porFecha: boolean
  clave: (fila: F) => string
  textoClave?: (clave: string) => string
  /** Cuánto suma cada registro (por defecto, 1: se cuentan registros). */
  peso?: (fila: F) => number
}

export function agruparRegistros<F>(filas: F[], agrupacion: Agrupacion<F>): GrupoRegistros<F>[] {
  const mapa = new Map<string, F[]>()
  for (const fila of filas) {
    const clave = agrupacion.clave(fila)
    mapa.set(clave, [...(mapa.get(clave) ?? []), fila])
  }
  const grupos = [...mapa.entries()].map(([clave, filasGrupo]) => ({
    clave,
    texto: agrupacion.textoClave ? agrupacion.textoClave(clave) : clave,
    valor: Math.round(filasGrupo.reduce((a, f) => a + (agrupacion.peso ? agrupacion.peso(f) : 1), 0) * 100) / 100,
    filas: filasGrupo,
  }))
  return agrupacion.porFecha
    ? grupos.sort((a, b) => a.clave.localeCompare(b.clave))
    : grupos.sort((a, b) => b.valor - a.valor || a.texto.localeCompare(b.texto, 'es'))
}

const porDia = <F extends { fecha: string }>(): Agrupacion<F> => ({
  valor: 'dia',
  texto: 'Día',
  porFecha: true,
  clave: (f) => f.fecha,
  textoClave: formatearFecha,
})

export const AGRUPACIONES_ATENCIONES_ESPACIO: Agrupacion<FilaAtencionEspacio>[] = [
  porDia(),
  { valor: 'tipo', texto: 'Tipo de servicio', porFecha: false, clave: (f) => f.tipo_servicio },
  { valor: 'estado', texto: 'Estado', porFecha: false, clave: (f) => f.estado },
  { valor: 'espacio', texto: 'Espacio', porFecha: false, clave: (f) => f.espacio ?? TEXTO_SIN_ESPACIO },
]

export const AGRUPACIONES_CUMPLIMIENTO: Agrupacion<FilaAtencionPeriodo>[] = [
  { valor: 'proveedor', texto: 'Proveedor', porFecha: false, clave: (f) => f.proveedor },
  porDia(),
  { valor: 'tipo', texto: 'Tipo de servicio', porFecha: false, clave: (f) => f.tipo_servicio },
]

/** En el consumo se suma la cantidad (las filas ya vienen de una sola unidad). */
const cantidad = (f: FilaMovimientoMaterial) => numeroDeDecimal(f.cantidad) ?? 0

export const AGRUPACIONES_CONSUMO: Agrupacion<FilaMovimientoMaterial>[] = [
  { valor: 'material', texto: 'Material', porFecha: false, clave: (f) => f.tipo_material, peso: cantidad },
  { valor: 'espacio', texto: 'Espacio', porFecha: false, clave: (f) => f.espacio ?? TEXTO_SIN_ESPACIO, peso: cantidad },
  { ...porDia<FilaMovimientoMaterial>(), peso: cantidad },
]

/** Unidades distintas de los movimientos de material, en orden alfabético. */
export function unidadesDe(filas: FilaMovimientoMaterial[]): string[] {
  return [...new Set(filas.map((f) => f.unidad))].sort((a, b) => a.localeCompare(b, 'es'))
}
