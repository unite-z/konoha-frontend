import type { ResultadoPanel } from '@/types/reportesGestion'
import { valorTarjeta } from '@/utils/reportesGestion'

/**
 * Frases del resumen de Reportes, calculadas con las cifras del panel (P-15: no es texto de IA). Una por indicador
 * con datos y, al final, una sola con los que no tienen datos en el periodo.
 */
export function frasesResumen(panel: ResultadoPanel): string[] {
  const frases: string[] = []
  const sinDatos: string[] = []
  for (const r of panel.indicadores) {
    const valor = valorTarjeta(r)
    if (valor === null) sinDatos.push(r.indicador.nombre)
    else frases.push(`${r.indicador.nombre}: ${valor} ${r.indicador.unidad}.`)
  }
  if (sinDatos.length > 0) frases.push(`Sin datos en el periodo: ${sinDatos.join(', ')}.`)
  return frases
}
