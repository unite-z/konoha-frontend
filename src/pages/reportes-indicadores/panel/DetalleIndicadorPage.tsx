// RF-REP-001 · HU-MOD06-001 (criterio 3) · CU-MOD06-001
/**
 * Detalle de un indicador del panel con los mismos filtros. Se completa en la parte 3.
 */
import { useLocation } from 'react-router'
import { usePaginaActual } from '../../../hooks/usePaginaActual'
import { MIGAS, RUTAS } from '../../../router/rutasApp'
import { rutaDetalleConFiltros } from '../../../utils/reportesGestion'

/** Título mientras no llega el nombre del indicador. */
const TITULO_PROVISIONAL = 'Detalle del indicador'

export default function DetalleIndicadorPage() {
  const { search } = useLocation()
  // La miga «Panel» vuelve al panel con los mismos filtros.
  const migaPanel = { ...MIGAS.panel, ruta: rutaDetalleConFiltros(RUTAS.panel, search) }
  usePaginaActual(TITULO_PROVISIONAL, [MIGAS.reportesIndicadores, migaPanel, { texto: TITULO_PROVISIONAL }])
  return null
}
