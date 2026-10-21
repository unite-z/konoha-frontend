/**
 * Servicios de los reportes del MOD-06 (solo lectura, GET).
 * Rutas relativas a API_BASE_URL (`backend/reportes_indicadores/api/urls.py`).
 */
import type { Periodo } from '../../types/comun'
import type {
  FiltrosAtenciones,
  FiltrosDistribucion,
  ResultadoAtencionesEspacioSector,
  ResultadoCumplimientoCorte,
  ResultadoDistribucionPersonal,
} from '../../types/reportes'
import { solicitar } from './cliente'

/** RF-REP-002: `GET reportes/cumplimiento-corte/`. */
export function obtenerCumplimientoCorte(periodo: Periodo, signal?: AbortSignal) {
  return solicitar<ResultadoCumplimientoCorte>('reportes/cumplimiento-corte/', {
    parametros: { desde: periodo.desde, hasta: periodo.hasta },
    signal,
  })
}

/** RF-REP-004: `GET reportes/distribucion-personal/`. */
export function obtenerDistribucionPersonal(
  periodo: Periodo,
  filtros: FiltrosDistribucion = {},
  signal?: AbortSignal,
) {
  return solicitar<ResultadoDistribucionPersonal>('reportes/distribucion-personal/', {
    parametros: { desde: periodo.desde, hasta: periodo.hasta, ...filtros },
    signal,
  })
}

/** RF-REP-006: `GET reportes/atenciones-espacio-sector/`. */
export function obtenerAtencionesEspacioSector(
  periodo: Periodo,
  filtros: FiltrosAtenciones = {},
  signal?: AbortSignal,
) {
  return solicitar<ResultadoAtencionesEspacioSector>('reportes/atenciones-espacio-sector/', {
    parametros: { desde: periodo.desde, hasta: periodo.hasta, ...filtros },
    signal,
  })
}
