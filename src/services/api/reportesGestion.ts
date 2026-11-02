/**
 * Servicios de los reportes de gestión del MOD-06 (RF-REP-001, RF-REP-005 y RF-REP-007). Solo lectura (GET).
 * Rutas relativas a `API_REPORTES_GESTION_URL`. Las páginas no llaman a `fetch`: usan estas funciones.
 *
 * Los catálogos de los filtros (espacios y tipos de servicio) son los de MOD-05 (`tercerizados.ts`), con la
 * misma sesión: sus ids son los que el backend espera en `area_verde_id` y `tipo_servicio_id`.
 */
import type {
  ClaveIndicadorPanel,
  ConsultaGestion,
  ConsultaMapa,
  DetalleIndicadorPanel,
  ResultadoMapaAtenciones,
  ResultadoMaterialVegetal,
  ResultadoPanel,
} from '../../types/reportesGestion'
import { solicitarReportesGestion } from './clienteReportesGestion'

/** RF-REP-001: `GET panel/`. */
export function obtenerPanel(consulta: ConsultaGestion, signal?: AbortSignal) {
  return solicitarReportesGestion<ResultadoPanel>('panel/', { parametros: { ...consulta }, signal })
}

/** RF-REP-001: `GET panel/{clave}/` con los mismos filtros y `page` (número o «last»). */
export function obtenerDetalleIndicador<F>(
  clave: ClaveIndicadorPanel,
  consulta: ConsultaGestion,
  pagina?: string,
  signal?: AbortSignal,
) {
  return solicitarReportesGestion<DetalleIndicadorPanel<F>>(`panel/${encodeURIComponent(clave)}/`, {
    parametros: { ...consulta, page: pagina },
    signal,
  })
}

/** RF-REP-005: `GET material-vegetal/?mes=AAAA-MM`. */
export function obtenerMaterialVegetal(mes: string, areaVerdeId: number | undefined, signal?: AbortSignal) {
  return solicitarReportesGestion<ResultadoMaterialVegetal>('material-vegetal/', {
    parametros: { mes, area_verde_id: areaVerdeId },
    signal,
  })
}

/** RF-REP-007: `GET mapa-atenciones/`. */
export function obtenerMapaAtenciones(consulta: ConsultaMapa, signal?: AbortSignal) {
  return solicitarReportesGestion<ResultadoMapaAtenciones>('mapa-atenciones/', { parametros: { ...consulta }, signal })
}
