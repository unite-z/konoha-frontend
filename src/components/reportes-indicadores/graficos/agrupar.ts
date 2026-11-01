/**
 * Agrupación de registros para los gráficos del MOD-06 (panel, detalle de indicadores y material vegetal):
 * por un criterio, contando registros o sumando un peso (por ejemplo, la cantidad). Lógica pura.
 */

export interface GrupoRegistros<F> {
  clave: string
  texto: string
  valor: number
  filas: F[]
}

/** Formas de agrupar los registros en un gráfico. */
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
