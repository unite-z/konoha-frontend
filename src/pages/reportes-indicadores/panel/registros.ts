/**
 * Registros del detalle de un indicador (RF-REP-001) para sus gráficos: se descargan todas las páginas del
 * back-end (25 por página) hasta un tope, y se agrupan según lo que elija la persona.
 */
import { type Agrupacion } from '../../../components/reportes-indicadores/graficos/agrupar'
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

// La agrupación es común a los gráficos del MOD-06.
export { agruparRegistros, type Agrupacion, type GrupoRegistros } from '../../../components/reportes-indicadores/graficos/agrupar'

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
