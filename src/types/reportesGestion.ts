/**
 * Tipos de los reportes de gestión del MOD-06 (RF-REP-001, RF-REP-005 y RF-REP-007).
 * Reflejo de los records de `konoha-backend` (`mod06/gestion/servicios/`), con las claves en snake_case
 * como el JSON (ADR 0005). Base de la API: `/api/v1/reportes` con HTTP Basic.
 */
import type { FechaIso, Periodo, ReporteBase } from './comun'
import type { Modalidad } from './reportes'

// =============================================================================
// RF-REP-001: panel de indicadores
// =============================================================================

/** Claves de los cinco indicadores del panel, en el orden del CU-MOD06-001 (paso 4). */
export type ClaveIndicadorPanel =
  | 'actividades-por-estado'
  | 'distribucion-operarios'
  | 'atenciones-por-espacio'
  | 'consumo-materiales'
  | 'cumplimiento-tercerizados'

/** DefinicionIndicador de los reportes de gestión (`Indicador.java`). `meta`: texto decimal o null (≠ `Indicador` de comun.ts). */
export interface IndicadorGestion {
  codigo: string
  nombre: string
  descripcion_calculo: string
  meta: string | null
  unidad: string
}

/** Una línea del desglose de un indicador (`ElementoDesglose.java`). `valor`: texto con punto decimal. */
export interface ElementoDesglose {
  etiqueta: string
  valor: string
}

/** Un indicador del panel (`ResultadoIndicador.java`). `valor` es texto (punto decimal) o null si `sin_datos`. */
export interface ResultadoIndicador {
  clave: ClaveIndicadorPanel
  indicador: IndicadorGestion
  valor: string | null
  sin_datos: boolean
  mensaje_sin_datos: string | null
  desglose: ElementoDesglose[]
  notas: string[]
}

/** `filtros_aplicados` del panel y de su detalle (`FiltrosPanel.java`); los no indicados llegan a null. */
export interface FiltrosPanelAplicados {
  desde: FechaIso
  hasta: FechaIso
  area_verde_id: number | null
  tipo_servicio_id: number | null
  estado: string | null
  modalidad: Modalidad | null
}

/** GET /api/v1/reportes/panel/ (RF-REP-001, `PanelIndicadores.java`). */
export interface ResultadoPanel extends ReporteBase<FiltrosPanelAplicados> {
  indicadores: ResultadoIndicador[]
  notas: string[]
}

/** Fila del detalle de «atenciones-por-espacio» (`ParAtencionEspacio.java`). */
export interface FilaAtencionEspacio {
  atencion_id: number
  codigo: string
  tipo_servicio: string
  estado: string
  fecha: FechaIso
  area_verde_id: number | null
  espacio: string | null
}

/** Fila del detalle de «cumplimiento-tercerizados» (`AtencionDelPeriodo.java`). */
export interface FilaAtencionPeriodo {
  atencion_id: number
  codigo: string
  tipo_servicio: string
  estado: string
  fecha: FechaIso
  proveedor: string
}

/** Fila del detalle de «consumo-materiales» (`MovimientoConsumo.java`). `cantidad`: texto decimal. */
export interface FilaMovimientoMaterial {
  id: number
  actividad_id: number
  fecha: FechaIso
  area_verde_id: number | null
  espacio: string | null
  tipo_material: string
  categoria: string
  especie: string | null
  cantidad: string
  unidad: string
}

/** GET /api/v1/reportes/panel/{clave}/ (`DetalleIndicador.java`): sobre común + paginación de 25. */
export interface DetalleIndicadorPanel<F> extends ReporteBase<FiltrosPanelAplicados> {
  indicador: IndicadorGestion
  count: number
  next: string | null
  previous: string | null
  results: F[]
  notas: string[]
}

// =============================================================================
// RF-REP-005: consumo y propagación de material vegetal
// =============================================================================

/** Total consumido o propagado por espacio, material y unidad (`TotalMaterial.java`). */
export interface TotalMaterial {
  area_verde_id: number | null
  espacio: string
  tipo_material: string
  categoria: string
  unidad: string
  cantidad: string
  movimientos: number
}

/** Total trasladado por origen, destino, material y unidad (`TotalTraslado.java`). */
export interface TotalTraslado {
  origen_area_id: number | null
  origen: string
  destino_area_id: number | null
  destino: string
  tipo_material: string
  categoria: string
  unidad: string
  cantidad: string
  movimientos: number
}

/** Total de un mes por material y unidad, sin espacio (`TotalMes.java`). */
export interface TotalMes {
  tipo_material: string
  unidad: string
  cantidad: string
}

/** Un mes anterior de la comparación (`ComparacionMes.java`). `mes`: AAAA-MM. */
export interface ComparacionMes {
  mes: string
  sin_datos: boolean
  consumido: TotalMes[]
  propagado: TotalMes[]
  trasladado: TotalMes[]
}

/** Vista que aún no tiene datos en el sistema, con su motivo (`SeccionNoDisponible.java`). */
export interface SeccionNoDisponible {
  sin_datos: boolean
  mensaje_sin_datos: string | null
}

/** `filtros_aplicados` del material vegetal (`FiltrosMaterialVegetal.java`). */
export interface FiltrosMaterialVegetal {
  mes: string
  area_verde_id: number | null
}

/** GET /api/v1/reportes/material-vegetal/ (RF-REP-005, `ReporteMaterialVegetal.java`). */
export interface ResultadoMaterialVegetal extends ReporteBase<FiltrosMaterialVegetal> {
  indicador: IndicadorGestion
  consumido: TotalMaterial[]
  propagado: TotalMaterial[]
  trasladado: TotalTraslado[]
  comparacion: ComparacionMes[]
  productos_proveedor: SeccionNoDisponible
  notas: string[]
}

// =============================================================================
// RF-REP-007: mapa de atenciones
// =============================================================================

/** Tipo de atención del mapa (`TiposAtencion.java`). */
export type TipoAtencion = 'Mantenimiento' | 'Poda' | 'Fitosanitario'

/** Resumen de una atención en el mapa (CU-MOD06-003, paso 6; `AtencionMapa.java`). Una fila por espacio o ejemplar. */
export interface AtencionMapa {
  atencion_id: number
  codigo: string
  tipo_atencion: TipoAtencion
  tipo_servicio: string
  fecha: FechaIso
  estado: string
  modalidad: Modalidad
  es_riesgo: boolean
  proveedor: string
  area_verde_id: number | null
  /** «Sin espacio» si `area_verde_id` es null. */
  espacio: string
  ejemplar_id: number | null
  ejemplar_codigo: string | null
  archivos_asociados: number
}

/** Geometrías GeoJSON admitidas (EPSG:4326, [longitud, latitud]). Otras se descartan con un guarda de tipo. */
export type GeometriaAtencion =
  | { type: 'Point'; coordinates: [number, number] }
  | { type: 'Polygon'; coordinates: [number, number][][] }
  | { type: 'MultiPolygon'; coordinates: [number, number][][][] }

/** Feature de GeoJSON (`ElementoGeoJson.java`). La geometría llega sin validar: se comprueba antes de usarla. */
export interface ElementoGeoJson {
  type: 'Feature'
  geometry: unknown
  properties: AtencionMapa
}

/** FeatureCollection de GeoJSON (`ColeccionGeoJson.java`). */
export interface ColeccionGeoJson {
  type: 'FeatureCollection'
  features: ElementoGeoJson[]
}

/** Atenciones distintas de un tipo (`TotalTipoAtencion.java`). */
export interface TotalTipoAtencion {
  tipo_atencion: TipoAtencion
  total: number
}

/** `filtros_aplicados` del mapa (`FiltrosMapa.java`); los no indicados llegan a null. */
export interface FiltrosMapaAplicados {
  desde: FechaIso
  hasta: FechaIso
  tipo_atencion: TipoAtencion | null
  tipo_uso_id: number | null
  area_verde_id: number | null
  tipo_servicio_id: number | null
  estado: string | null
  modalidad: Modalidad | null
  es_riesgo: boolean | null
}

/** GET /api/v1/reportes/mapa-atenciones/ (RF-REP-007, `MapaAtenciones.java`). */
export interface ResultadoMapaAtenciones extends ReporteBase<FiltrosMapaAplicados> {
  indicador: IndicadorGestion
  totales_por_tipo: TotalTipoAtencion[]
  mapa: ColeccionGeoJson
  sin_coordenadas: AtencionMapa[]
  notas: string[]
}

// =============================================================================
// Parámetros de consulta (los vacíos no se envían)
// =============================================================================

/** Parámetros comunes del panel, de su detalle y del mapa. */
export interface ConsultaGestion extends Periodo {
  area_verde_id?: number
  tipo_servicio_id?: number
  estado?: string
  modalidad?: Modalidad
}

/** Parámetros del mapa de atenciones. */
export interface ConsultaMapa extends ConsultaGestion {
  tipo_atencion?: TipoAtencion
  tipo_uso_id?: number
  es_riesgo?: boolean
}
