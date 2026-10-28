// RF-REP-001 · HU-MOD06-001 · CU-MOD06-001
/**
 * Panel de indicadores de gestión. Se completa en la parte 3.
 */
import { usePaginaActual } from '../../../hooks/usePaginaActual'
import { MIGAS } from '../../../router/rutasApp'

const TITULO = 'Panel de indicadores'

export default function PanelIndicadoresPage() {
  usePaginaActual(TITULO, [MIGAS.reportesIndicadores, { texto: 'Panel' }])
  return null
}
