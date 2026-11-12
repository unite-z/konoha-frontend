/**
 * Tipos de los reportes de gestión del MOD-06 (RF-REP-001, RF-REP-005, RF-REP-007, RF-REP-008 y RF-REP-010).
 * Reflejo de los records de `konoha-backend` (`mod06/gestion/servicios/`), con las claves en snake_case
 * como el JSON (ADR 0005). Base de la API: `/api/v1/reportes` con HTTP Basic.
 */
import type { FechaIso, InstanteIso, Periodo, ReporteBase } from './comun'
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

/**
 * Fila del detalle de «actividades-por-estado» (`ActividadCampo.java`, MOD-04). `estado`: el del parte diario
 * («Abierto» o «Cerrado»); la actividad no tiene estado propio.
 */
export interface FilaActividadCampo {
  id: number
  fecha: FechaIso
  estado: string
  tipo_actividad: string
  area_verde_id: number | null
  espacio: string | null
  cuadrilla: string
}

/** Fila del detalle de «distribucion-operarios» (`ParticipacionOperario.java`, MOD-04): un operario en una actividad. */
export interface FilaParticipacionOperario {
  actividad_id: number
  fecha: FechaIso
  operario_id: number
  operario: string
  cuadrilla: string
  area_verde_id: number | null
  espacio: string | null
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

/**
 * Producto agronómico aplicado por un proveedor en el mes (`TotalProductoProveedor.java`). La dosis es texto libre
 * en MOD-05: llegan las distintas, sin sumar.
 */
export interface ProductoProveedor {
  producto_id: number
  producto: string
  principio_activo: string | null
  proveedor_id: number
  proveedor: string
  /** Atenciones del mes en las que el proveedor aplicó el producto. */
  aplicaciones: number
  dosis: string[]
  /** Códigos de esas atenciones, en orden de fecha. */
  atenciones: string[]
}

/** Productos aplicados por proveedores, en una vista aparte del material (`ProductosProveedor.java`). */
export interface ProductosProveedor extends SeccionNoDisponible {
  productos: ProductoProveedor[]
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
  productos_proveedor: ProductosProveedor
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

// =============================================================================
// RF-REP-008: reporte por servicio tercerizado
// =============================================================================

/** `filtros_aplicados` del reporte por servicio. */
export interface FiltrosReporteServicio {
  tipo_servicio_id: number
  proveedor_id: number | null
  contrato_id: number | null
}

/** Servicio y contrato del reporte (cabecera). */
export interface ServicioReportado {
  tipo_servicio_id: number
  nombre: string
  proveedor: { id: number; nombre: string } | null
  contrato: { id: number; codigo: string; vigencia_desde: FechaIso; vigencia_hasta: FechaIso | null } | null
}

/** Avance: atenciones del periodo por situación y metrado ejecutado frente al previsto. */
export interface AvanceServicio extends SeccionNoDisponible {
  programadas: number
  extraordinarias: number
  ejecutadas: number
  en_ejecucion: number
  pendientes: number
  /** Ejecutadas / (programadas + extraordinarias), en texto con punto decimal, o null. */
  porcentaje_avance: string | null
  metrado_previsto: string | null
  metrado_ejecutado: string | null
  unidad_metrado: string | null
}

/** Rendimiento: producción por tiempo de ejecución. */
export interface RendimientoServicio extends SeccionNoDisponible {
  horas_ejecucion: string | null
  /** Metrado ejecutado por hora (texto decimal) o null. */
  rendimiento_por_hora: string | null
  unidad_rendimiento: string | null
  duracion_media_horas: string | null
  atenciones_fuera_de_plazo: number | null
}

/** Especie o plaga atendida. */
export interface ElementoAtendido {
  tipo: 'Especie' | 'Plaga'
  nombre: string
  atenciones: number
  ejemplares: number | null
}

export interface EspeciesPlagasServicio extends SeccionNoDisponible {
  elementos: ElementoAtendido[]
}

/** Conformidad del periodo (ResultadoConformidad: Conforme u Observada). */
export interface ConformidadServicio extends SeccionNoDisponible {
  conformes: number
  observadas: number
  pendientes_de_revision: number
  sin_reporte_proveedor: number
  subsanaciones_abiertas: number
}

/** Registro de origen: una atención del periodo. */
export interface FilaAtencionServicio {
  id: number
  codigo: string
  clase: 'Programada' | 'Extraordinaria'
  estado: string
  /** Texto de interfaz del estado (como en MOD-05). */
  etiqueta_estado: string
  espacio: string | null
  ejemplar_codigo: string | null
  fecha_hora_inicio: InstanteIso | null
  fecha_hora_fin: InstanteIso | null
  metrado: string | null
  unidad: string | null
  conformidad: 'Conforme' | 'Observada' | null
  documentos: number
  /**
   * Especies o plagas atendidas en la atención (para abrir sus registros desde el gráfico).
   * SUPUESTO (pendiente de confirmar con el backend): campo añadido al contrato del ticket.
   */
  especies_plagas: string[]
  /** `false` → «Sin evidencia» (CU-MOD06-002 A2). */
  con_evidencia: boolean
  es_riesgo: boolean
}

/**
 * GET /api/v1/reportes/servicios-tercerizados/ (RF-REP-008).
 * SUPUESTO (pendiente de confirmar con el backend): el detalle `atenciones` llega completo (hasta 500 filas) y
 * se pagina en el cliente.
 */
export interface ResultadoReporteServicio extends ReporteBase<FiltrosReporteServicio> {
  servicio: ServicioReportado
  avance: AvanceServicio
  rendimiento: RendimientoServicio
  especies_plagas: EspeciesPlagasServicio
  conformidad: ConformidadServicio
  atenciones: FilaAtencionServicio[]
  atenciones_sin_evidencia: number
  notas: string[]
}

/** Consulta del reporte por servicio. */
export interface ConsultaReporteServicio extends Periodo {
  tipo_servicio_id: number
  proveedor_id?: number
  contrato_id?: number
}

/** Opciones de los filtros del reporte: tipos de servicio tercerizados y proveedores (catálogos de MOD-05). */
export interface CatalogoServicios {
  tipos_servicio: { id: number; nombre: string }[]
  proveedores: { id: number; nombre: string }[]
  /** `false` si algún catálogo tenía más páginas de las cargadas. */
  completo: boolean
}

// =============================================================================
// RF-REP-010: programado frente a ejecutado
// =============================================================================

/**
 * Situación de un trabajo programado al comparar con su ejecución (RF-REP-010).
 * SUPUESTO (pendiente de confirmar con el backend): la documentación dice «pendiente» y «desviación» sin fijar la
 * tolerancia; se usa 0 días (cualquier retraso del fin real es desviación). Regla en `situacionDe`
 * (`utils/programadoEjecutado.ts`):
 * - Cancelado: la programación está Cancelada;
 * - Ejecutado: una ejecución con fin real y `desviacion_dias` ≤ 0;
 * - EjecutadoConDesviacion: fin real y `desviacion_dias` > 0;
 * - EnCurso: una ejecución con inicio y sin fin;
 * - Pendiente: sin ejecución, o sin inicio real.
 */
export type SituacionProgramacion = 'Ejecutado' | 'EjecutadoConDesviacion' | 'EnCurso' | 'Pendiente' | 'Cancelado'

/** Ejecución vinculada a una programación: atención tercerizada o actividad de personal propio. */
export interface EjecucionVinculada {
  origen: 'Atencion' | 'Actividad'
  id: number
  codigo: string
  estado: string
  etiqueta_estado: string
  inicio_real: InstanteIso | null
  fin_real: InstanteIso | null
}

/** Una fila de la comparación: un trabajo programado. */
export interface FilaProgramadoEjecutado {
  programacion_id: number
  tipo_servicio: string
  modalidad: Modalidad
  /** Proveedor o cuadrilla. */
  responsable: string | null
  espacio: string | null
  ventana_mes: string | null
  inicio_previsto: FechaIso
  fin_previsto: FechaIso
  estado_programacion: 'Programada' | 'EnCurso' | 'Completada' | 'Cancelada'
  ejecuciones: EjecucionVinculada[]
  situacion: SituacionProgramacion
  etiqueta_situacion: string
  /** Días de retraso del fin real frente al fin previsto (positivo = tarde; null si no hay fin real). */
  desviacion_dias: number | null
}

/** Totales del periodo. */
export interface ResumenProgramadoEjecutado {
  programados: number
  ejecutados: number
  ejecutados_con_desviacion: number
  en_curso: number
  pendientes: number
  cancelados: number
  /** (ejecutados + con desviación) / (programados − cancelados), texto decimal o null. */
  porcentaje_cumplimiento: string | null
  /** Ejecuciones del periodo que no tienen programación vinculada. */
  ejecuciones_sin_programacion: number
}

/** Línea por servicio (barras «programado frente a ejecutado»). */
export interface ComparacionPorServicio {
  tipo_servicio_id: number
  tipo_servicio: string
  modalidad: Modalidad
  programados: number
  ejecutados: number
  pendientes: number
}

export interface FiltrosProgramadoEjecutado {
  tipo_servicio_id: number | null
  area_verde_id: number | null
  modalidad: Modalidad | null
  situacion: SituacionProgramacion | null
}

/** GET /api/v1/reportes/programado-ejecutado/ (RF-REP-010). El backend aplica los filtros a los dos conjuntos. */
export interface ResultadoProgramadoEjecutado extends ReporteBase<FiltrosProgramadoEjecutado> {
  resumen: ResumenProgramadoEjecutado
  por_servicio: ComparacionPorServicio[]
  filas: FilaProgramadoEjecutado[]
  sin_programacion: EjecucionVinculada[]
  /** Por ejemplo, el personal propio sin datos hasta que lo aporte Operación de campo. */
  personal_propio: SeccionNoDisponible
  notas: string[]
}

export interface ConsultaProgramadoEjecutado extends Periodo {
  tipo_servicio_id?: number
  area_verde_id?: number
  modalidad?: Modalidad
  situacion?: SituacionProgramacion
}

/** Opciones de los filtros de la comparación (catálogos de MOD-05: todos los tipos de servicio y los espacios). */
export interface CatalogoComparacion {
  tipos_servicio: { id: number; nombre: string }[]
  espacios: { id: number; nombre: string }[]
  /** `false` si algún catálogo tenía más páginas de las cargadas. */
  completo: boolean
}
