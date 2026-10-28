// RF-REP-005 · HU-MOD05-029 · CU-MOD05-029
/**
 * Consumo y propagación de material vegetal (reporte mensual). Se completa en la parte 4.
 */
import { usePaginaActual } from '../../../hooks/usePaginaActual'
import { MIGAS } from '../../../router/rutasApp'

const TITULO = 'Consumo y propagación de material vegetal'

export default function MaterialVegetalPage() {
  usePaginaActual(TITULO, [MIGAS.reportesIndicadores, MIGAS.reportes, { texto: TITULO }])
  return null
}
