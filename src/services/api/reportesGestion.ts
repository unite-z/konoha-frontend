/**
 * Servicios de los reportes de gestión del MOD-06 (RF-REP-001, RF-REP-005, RF-REP-007 y RF-REP-008). Solo lectura (GET).
 * Rutas relativas a `API_REPORTES_GESTION_URL`. Las páginas no llaman a `fetch`: usan estas funciones.
 *
 * Los catálogos de los filtros (espacios y tipos de servicio) son los de MOD-05 (`tercerizados.ts`), con la
 * misma sesión: sus ids son los que el backend espera en `area_verde_id` y `tipo_servicio_id`.
 */
import { DATOS_SIMULADOS } from '../../config/datosSimulados'
import type {
  CatalogoServicios,
  ClaveIndicadorPanel,
  ConsultaGestion,
  ConsultaMapa,
  ConsultaReporteServicio,
  DetalleIndicadorPanel,
  ResultadoMapaAtenciones,
  ResultadoMaterialVegetal,
  ResultadoPanel,
  ResultadoReporteServicio,
} from '../../types/reportesGestion'
import { solicitarReportesGestion } from './clienteReportesGestion'
import { listarProveedores, listarTiposServicio, listarTodo } from './tercerizados'

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

/** RF-REP-008: `GET servicios-tercerizados/`. */
export async function obtenerReporteServicio(consulta: ConsultaReporteServicio, signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularReporteServicio } = await import('../simulados/reporteServicio')
    return simularReporteServicio(consulta, signal)
  }
  return solicitarReportesGestion<ResultadoReporteServicio>('servicios-tercerizados/', {
    parametros: { ...consulta },
    signal,
  })
}

/**
 * RF-REP-008: opciones de los filtros, de los catálogos de MOD-05 (todas las páginas).
 * SUPUESTO (pendiente de confirmar con el backend): los tipos tercerizados son los de `ejecutor` «Tercerizado»,
 * como en el alta de contratos de MOD-05.
 */
export async function obtenerCatalogoServicios(signal?: AbortSignal): Promise<CatalogoServicios> {
  if (DATOS_SIMULADOS) {
    const { simularCatalogoServicios } = await import('../simulados/reporteServicio')
    return simularCatalogoServicios(signal)
  }
  const [tipos, proveedores] = await Promise.all([
    listarTodo((page) => listarTiposServicio({ page }, signal)),
    listarTodo((page) => listarProveedores({ page }, signal)),
  ])
  return {
    tipos_servicio: tipos.resultados.filter((t) => t.ejecutor === 'Tercerizado').map(({ id, nombre }) => ({ id, nombre })),
    proveedores: proveedores.resultados.map((p) => ({ id: p.id, nombre: p.razon_social })),
    completo: tipos.completo && proveedores.completo,
  }
}
