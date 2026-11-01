/**
 * Gráficos de RF-REP-005 (consumo, propagación y traslado de material vegetal de un mes). Lógica pura.
 *
 * - Movimientos del mes: agrupaciones de cada pestaña; se suma la cantidad y nunca entre unidades distintas.
 * - Comparación: los 3 meses anteriores (del back-end) más el mes elegido (calculado con los totales del mes),
 *   por movimiento, unidad y material. Un mes sin movimientos queda sin valor (nunca se muestra como cero).
 */
import type { Agrupacion } from '../../../../components/reportes-indicadores/graficos/agrupar'
import type { ResultadoMaterialVegetal, TotalMaterial, TotalMes, TotalTraslado } from '../../../../types/reportesGestion'
import { formatearMes } from '../../../../utils/formato'
import { numeroDeDecimal } from '../../../../utils/reportesGestion'

export type Movimiento = 'consumido' | 'propagado' | 'trasladado'

export const MOVIMIENTOS: { valor: Movimiento; texto: string }[] = [
  { valor: 'consumido', texto: 'Consumido' },
  { valor: 'propagado', texto: 'Propagado' },
  { valor: 'trasladado', texto: 'Trasladado' },
]

const cantidad = (f: { cantidad: string }) => numeroDeDecimal(f.cantidad) ?? 0

export const unidadDe = (f: { unidad: string }) => f.unidad

export const AGRUPACIONES_MATERIAL: Agrupacion<TotalMaterial>[] = [
  { valor: 'material', texto: 'Material', porFecha: false, clave: (f) => f.tipo_material, peso: cantidad },
  { valor: 'espacio', texto: 'Espacio', porFecha: false, clave: (f) => f.espacio, peso: cantidad },
  { valor: 'categoria', texto: 'Categoría', porFecha: false, clave: (f) => f.categoria, peso: cantidad },
]

/** «Jardín central → Vivero». */
export function textoRuta(t: TotalTraslado): string {
  return `${t.origen} → ${t.destino}`
}

export const AGRUPACIONES_TRASLADO: Agrupacion<TotalTraslado>[] = [
  { valor: 'ruta', texto: 'Ruta', porFecha: false, clave: textoRuta, peso: cantidad },
  { valor: 'material', texto: 'Material', porFecha: false, clave: (f) => f.tipo_material, peso: cantidad },
  { valor: 'origen', texto: 'Origen', porFecha: false, clave: (f) => f.origen, peso: cantidad },
  { valor: 'destino', texto: 'Destino', porFecha: false, clave: (f) => f.destino, peso: cantidad },
]

// --- Comparación con meses anteriores ------------------------------------------------------------------------

export interface MesComparacion {
  /** AAAA-MM. */
  mes: string
  sinDatos: boolean
  /** Totales del mes por material y unidad, de cada movimiento. */
  totales: Record<Movimiento, TotalMes[]>
}

/** Totales del mes por material y unidad (suma de todos los espacios o rutas). */
export function totalesDelMes(filas: { tipo_material: string; unidad: string; cantidad: string }[]): TotalMes[] {
  const mapa = new Map<string, TotalMes>()
  for (const f of filas) {
    const clave = `${f.tipo_material}|${f.unidad}`
    const previo = numeroDeDecimal(mapa.get(clave)?.cantidad) ?? 0
    mapa.set(clave, {
      tipo_material: f.tipo_material,
      unidad: f.unidad,
      cantidad: String(Math.round((previo + cantidad(f)) * 100) / 100),
    })
  }
  return [...mapa.values()]
}

/** Meses de la comparación, del más antiguo al mes elegido. */
export function mesesComparacion(datos: ResultadoMaterialVegetal): MesComparacion[] {
  const anteriores = datos.comparacion.map((c) => ({
    mes: c.mes,
    sinDatos: c.sin_datos,
    totales: { consumido: c.consumido, propagado: c.propagado, trasladado: c.trasladado },
  }))
  const actual: MesComparacion = {
    mes: datos.filtros_aplicados.mes,
    sinDatos: datos.sin_datos,
    totales: {
      consumido: totalesDelMes(datos.consumido),
      propagado: totalesDelMes(datos.propagado),
      trasladado: totalesDelMes(datos.trasladado),
    },
  }
  return [...anteriores, actual].sort((a, b) => a.mes.localeCompare(b.mes))
}

/** Unidades presentes en un movimiento de la comparación. */
export function unidadesComparacion(meses: MesComparacion[], movimiento: Movimiento): string[] {
  const unidades = new Set(meses.flatMap((m) => m.totales[movimiento].map((t) => t.unidad)))
  return [...unidades].sort((a, b) => a.localeCompare(b, 'es'))
}

/** Materiales de un movimiento y unidad en la comparación. */
export function materialesComparacion(meses: MesComparacion[], movimiento: Movimiento, unidad: string): string[] {
  const materiales = new Set(
    meses.flatMap((m) => m.totales[movimiento].filter((t) => t.unidad === unidad).map((t) => t.tipo_material)),
  )
  return [...materiales].sort((a, b) => a.localeCompare(b, 'es'))
}

export interface PuntoComparacion {
  mes: string
  /** Texto bajo la columna («oct. 2026»). */
  texto: string
  /** null: el mes no tiene movimientos de esa unidad (y material). */
  valor: number | null
  filas: TotalMes[]
}

/** Total de cada mes para un movimiento y unidad, de todos los materiales o de uno. */
export function serieComparacion(
  meses: MesComparacion[],
  movimiento: Movimiento,
  unidad: string,
  material: string | null,
): PuntoComparacion[] {
  return meses.map((m) => {
    const filas = m.totales[movimiento].filter((t) => t.unidad === unidad && (material === null || t.tipo_material === material))
    const valor = m.sinDatos || filas.length === 0 ? null : Math.round(filas.reduce((a, f) => a + cantidad(f), 0) * 100) / 100
    return { mes: m.mes, texto: formatearMes(m.mes), valor, filas }
  })
}
