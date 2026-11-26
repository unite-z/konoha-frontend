import type { ValoresCronograma } from '@/types/cronogramaIa'
import { textoPeriodoCorto } from '@/utils/cronogramaIa'

/** «04 nov. – 06 nov. · 3 operarios»: lo que queda tras modificar una sugerencia. */
export function textoValores(valores: ValoresCronograma): string {
  const operarios = valores.operarios === null ? '' : ` · ${valores.operarios} operarios`
  return `${textoPeriodoCorto(valores.fecha_inicio, valores.fecha_fin)}${operarios}`
}
