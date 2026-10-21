/**
 * Contrato de la API de MOD-05 «Atenciones tercerizadas» (`backend-mod05/`).
 * Base: `/api/tercerizados/`. Fechas sin hora en `AAAA-MM-DD`; instantes ISO 8601 con zona.
 */
import type { FechaIso, InstanteIso } from './comun'

/** Roles del módulo Spring Boot. Distintos de los roles simulados de MOD-06. */
export type RolTercerizados = 'Jefe de sección' | 'Ingeniero de campo' | 'Practicante autorizado'

/** `GET me/`. `rol` es `null` si el usuario es válido pero no tiene acceso al módulo. */
export interface UsuarioActual {
  id: number
  usuario: string
  nombre: string
  rol: RolTercerizados | null
}

/** Listados paginados compatibles con la API original (25 por página). */
export interface Paginado<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type EstadoAtencion =
  | 'Requerimiento registrado'
  | 'OC referenciada'
  | 'En ejecución'
  | 'Ejecutado pendiente de reporte'
  | 'Reporte adjunto'

export type OrigenAtencion = 'Demanda' | 'ProgramacionEstacional' | 'SolicitudUnidad'

export type CategoriaDocumento =
  | 'InformeFinal'
  | 'Metrado'
  | 'PlantasAtendidas'
  | 'FichasDiarias'
  | 'CharlasTecnicas'
  | 'PlagasAtendidas'
  | 'ProductosAplicados'
  | 'EvidenciaEspacio'
  | 'RutaRecorrida'

/** Decimal serializado como texto («120.00»). */
export type DecimalTexto = string

export interface Alcance {
  id: number
  area_verde_id: number | null
  area_verde_nombre: string | null
  ejemplar_id: number | null
  ejemplar_codigo: string | null
  ejemplar_area_verde_nombre: string | null
  metrado: DecimalTexto | null
  unidad_medida_id: number | null
  unidad_medida_nombre: string | null
  unidad_medida_simbolo: string | null
}

export interface CambioEstado {
  estado_anterior: EstadoAtencion | ''
  estado_nuevo: EstadoAtencion
  usuario_id: number
  usuario_nombre: string | null
  fecha_hora: InstanteIso
}

export interface Atencion {
  id: number
  codigo: string
  contrato_id: number
  contrato_numero: string | null
  proveedor_id: number
  proveedor_nombre: string | null
  tipo_servicio_id: number
  tipo_servicio_nombre: string | null
  clase: string
  descripcion: string
  origen: OrigenAtencion
  unidad_solicitante_id: number | null
  unidad_solicitante_nombre: string | null
  unidad_solicitante_provisional: boolean | null
  solicitado_por_id: number
  solicitado_por_nombre: string | null
  numero_orden_compra: string
  fecha_orden_compra: InstanteIso | null
  fecha_hora_inicio: InstanteIso | null
  fecha_hora_fin: InstanteIso | null
  estado: EstadoAtencion
  es_riesgo: boolean
  /** `null`: la unidad aún no se pronuncia. */
  acuerdo_unidad: boolean | null
  fecha_acuerdo_unidad: FechaIso | null
  comentarios_acuerdo_unidad: string
  fecha_creacion: InstanteIso
  fecha_modificacion: InstanteIso
  usuario_creacion_id: number
  usuario_creacion_nombre: string | null
  usuario_modificacion_id: number
  alcances: Alcance[]
  historial: CambioEstado[]
}

export interface ArchivoDocumento {
  id: number
  nombre_original: string
  tipo_mime: string
  tamano_bytes: number
  hash_contenido: string
}

export interface DocumentoReporte {
  id: number
  categoria: CategoriaDocumento
  alcance_id: number | null
  descripcion: string
  archivo: ArchivoDocumento
}

export interface ReporteProveedor {
  id: number
  atencion_id: number
  revision: number
  fecha_recepcion: FechaIso
  resumen: string
  documentos: DocumentoReporte[]
  usuario_creacion_id: number
  usuario_creacion_nombre: string | null
  fecha_creacion: InstanteIso
}

// --- Entradas -------------------------------------------------------------------------------------------

/** Un alcance apunta a un área verde **o** a un ejemplar. Metrado y unidad van juntos o no van. */
export type AlcanceEntrada = ({ area_verde_id: number } | { ejemplar_id: number }) & {
  metrado?: DecimalTexto
  unidad_medida_id?: number
}

/** Origen y unidad: `SolicitudUnidad` exige unidad existente o provisional (solo una). */
export interface OrigenEntrada {
  origen: OrigenAtencion
  unidad_solicitante_id?: number
  unidad_provisional?: string
}

export interface CrearAtencionEntrada extends OrigenEntrada {
  contrato_id: number
  descripcion: string
  es_riesgo?: boolean
  alcances: AlcanceEntrada[]
}

export interface CorregirOrigenEntrada extends OrigenEntrada {
  motivo: string
}

export interface OrdenCompraEntrada {
  numero_orden_compra: string
  /** Obligatorio si la atención ya tiene OC (corrección). */
  motivo?: string
}

export interface AcuerdoUnidadEntrada {
  acuerdo_unidad: boolean | null
  fecha_acuerdo_unidad: FechaIso | null
  comentarios_acuerdo_unidad: string
}

export interface DocumentoEntrada {
  categoria: CategoriaDocumento
  alcance_id?: number
  descripcion?: string
  archivo: File
}

export interface ReporteEntrada {
  fecha_recepcion: FechaIso
  resumen?: string
  documentos: DocumentoEntrada[]
}

/** Filtros de `GET atenciones/`. */
export interface FiltrosAtenciones {
  q?: string
  estado?: EstadoAtencion
  origen?: OrigenAtencion
  contrato_id?: number
}

// --- Catálogos ------------------------------------------------------------------------------------------

export interface Proveedor {
  id: number
  razon_social: string
  activo: boolean
}

export interface Contrato {
  id: number
  numero: string
  proveedor_id: number
  proveedor_nombre: string | null
  tipo_servicio_id: number
  tipo_servicio_nombre: string | null
  vigencia_inicio: FechaIso
  vigencia_fin: FechaIso
}

export interface TipoServicio {
  id: number
  nombre: string
  ejecutor: string
  es_riesgo: boolean
  activo: boolean
}

export interface AreaVerde {
  id: number
  nombre: string
  activo: boolean
}

export interface Ejemplar {
  id: number
  codigo: string
  area_verde_id: number | null
  area_verde_nombre: string | null
}

export interface UnidadMedida {
  id: number
  nombre: string
  simbolo: string
}

export interface UnidadInstitucional {
  id: number
  nombre: string
  provisional: boolean
  activo: boolean
}

/** Parámetros comunes de los catálogos: búsqueda y página. */
export interface ConsultaCatalogo {
  q?: string
  page?: number
}
