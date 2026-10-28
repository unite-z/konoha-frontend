// RF-REP-007 · HU-MOD06-003 · CU-MOD06-003
/**
 * Mapa de atenciones de mantenimiento, poda y control fitosanitario. Se completa en la parte 5.
 */
import { usePaginaActual } from '../../../hooks/usePaginaActual'
import { MIGAS } from '../../../router/rutasApp'

const TITULO = 'Mapa de atenciones'

export default function MapaAtencionesPage() {
  usePaginaActual(TITULO, [MIGAS.reportesIndicadores, { texto: 'Mapa de atenciones' }])
  return null
}
