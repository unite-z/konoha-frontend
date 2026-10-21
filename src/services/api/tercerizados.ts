/**
 * Servicios de MOD-05 «Atenciones tercerizadas» (`backend/tercerizados/api/urls.py`).
 * Las páginas no llaman a `fetch`: usan estas funciones.
 *
 * Las operaciones devuelven la atención completa y actualizada: la página debe reemplazar su copia con la
 * respuesta, nunca suponer el resultado.
 */
import type {
  AcuerdoUnidadEntrada,
  AreaVerde,
  Atencion,
  ConsultaCatalogo,
  Contrato,
  CorregirOrigenEntrada,
  CrearAtencionEntrada,
  Ejemplar,
  FiltrosAtenciones,
  OrdenCompraEntrada,
  Paginado,
  Proveedor,
  ReporteEntrada,
  ReporteProveedor,
  TipoServicio,
  UnidadInstitucional,
  UnidadMedida,
  UsuarioActual,
} from '../../types/tercerizados'
import type { InstanteIso } from '../../types/comun'
import { descargarArchivoTercerizados, solicitarTercerizados } from './clienteTercerizados'

// --- Sesión ---------------------------------------------------------------------------------------------

/** `GET me/`. Con `autorizacion` comprueba unas credenciales antes de guardarlas. */
export function obtenerUsuarioActual(opciones: { autorizacion?: string; signal?: AbortSignal } = {}) {
  return solicitarTercerizados<UsuarioActual>('me/', opciones)
}

// --- Atenciones -----------------------------------------------------------------------------------------

export function listarAtenciones(filtros: FiltrosAtenciones = {}, pagina = 1, signal?: AbortSignal) {
  return solicitarTercerizados<Paginado<Atencion>>('atenciones/', {
    parametros: { ...filtros, page: pagina > 1 ? pagina : undefined },
    signal,
  })
}

export function obtenerAtencion(id: number, signal?: AbortSignal) {
  return solicitarTercerizados<Atencion>(`atenciones/${id}/`, { signal })
}

/** RF-SER-003 y RF-SER-011 (origen). No es idempotente: un reintento puede duplicar la atención. */
export function crearAtencion(entrada: CrearAtencionEntrada, signal?: AbortSignal) {
  return solicitarTercerizados<Atencion>('atenciones/', { metodo: 'POST', cuerpo: entrada, signal })
}

/** RF-SER-004. */
export function registrarOrdenCompra(id: number, entrada: OrdenCompraEntrada, signal?: AbortSignal) {
  return solicitarTercerizados<Atencion>(`atenciones/${id}/orden-compra/`, { metodo: 'PATCH', cuerpo: entrada, signal })
}

/** RF-SER-005. `instante` con zona, por ejemplo `2026-10-21T08:00:00-05:00`. */
export function registrarInicio(id: number, instante: InstanteIso, signal?: AbortSignal) {
  return solicitarTercerizados<Atencion>(`atenciones/${id}/inicio/`, {
    metodo: 'POST',
    cuerpo: { fecha_hora_inicio: instante },
    signal,
  })
}

/** RF-SER-005. */
export function registrarFin(id: number, instante: InstanteIso, signal?: AbortSignal) {
  return solicitarTercerizados<Atencion>(`atenciones/${id}/fin/`, {
    metodo: 'POST',
    cuerpo: { fecha_hora_fin: instante },
    signal,
  })
}

/** RF-SER-011: corrección antes del inicio, con motivo. */
export function corregirOrigen(id: number, entrada: CorregirOrigenEntrada, signal?: AbortSignal) {
  return solicitarTercerizados<Atencion>(`atenciones/${id}/origen/`, { metodo: 'PATCH', cuerpo: entrada, signal })
}

/** RF-SER-011: acuerdo de la unidad. No sustituye la conformidad ni cambia el estado. */
export function registrarAcuerdoUnidad(id: number, entrada: AcuerdoUnidadEntrada, signal?: AbortSignal) {
  return solicitarTercerizados<Atencion>(`atenciones/${id}/acuerdo-unidad/`, { metodo: 'PATCH', cuerpo: entrada, signal })
}

// --- Reportes y documentos (RF-SER-006) -----------------------------------------------------------------

export function listarReportes(id: number, pagina = 1, signal?: AbortSignal) {
  return solicitarTercerizados<Paginado<ReporteProveedor>>(`atenciones/${id}/reportes/`, {
    parametros: { page: pagina > 1 ? pagina : undefined },
    signal,
  })
}

/** Cuerpo multipart: `documentos` (JSON) y un archivo por documento, en el mismo orden. */
export function formularioReporte(entrada: ReporteEntrada): FormData {
  const formulario = new FormData()
  formulario.set('fecha_recepcion', entrada.fecha_recepcion)
  if (entrada.resumen?.trim()) formulario.set('resumen', entrada.resumen.trim())
  const documentos = entrada.documentos.map(({ categoria, alcance_id, descripcion }) => ({
    categoria,
    ...(alcance_id ? { alcance_id } : {}),
    ...(descripcion?.trim() ? { descripcion: descripcion.trim() } : {}),
  }))
  formulario.set('documentos', JSON.stringify(documentos))
  for (const documento of entrada.documentos) formulario.append('archivos', documento.archivo, documento.archivo.name)
  return formulario
}

/** Crea una revisión nueva completa. No es idempotente: un reintento crea otra revisión. */
export function adjuntarReporte(id: number, entrada: ReporteEntrada, signal?: AbortSignal) {
  return solicitarTercerizados<ReporteProveedor>(`atenciones/${id}/reportes/`, {
    metodo: 'POST',
    formulario: formularioReporte(entrada),
    signal,
  })
}

export function descargarDocumento(
  atencionId: number,
  reporteId: number,
  documentoId: number,
  nombre: string,
  signal?: AbortSignal,
) {
  return descargarArchivoTercerizados(
    `atenciones/${atencionId}/reportes/${reporteId}/documentos/${documentoId}/descarga/`,
    nombre,
    signal,
  )
}

// --- Catálogos (solo lectura) ---------------------------------------------------------------------------

function catalogo<T>(ruta: string, parametros: Record<string, string | number | boolean | undefined>, signal?: AbortSignal) {
  return solicitarTercerizados<Paginado<T>>(`catalogos/${ruta}/`, { parametros, signal })
}

export function listarContratos(consulta: ConsultaCatalogo & { vigente?: boolean; proveedor_id?: number; tipo_servicio_id?: number } = {}, signal?: AbortSignal) {
  return catalogo<Contrato>('contratos', { ...consulta }, signal)
}

/** Máximo de páginas que se recorren para llenar un selector completo (25 por página). */
const PAGINAS_MAXIMAS_SELECTOR = 20

/**
 * Todos los contratos (para el filtro de la bandeja). Recorre las páginas hasta `PAGINAS_MAXIMAS_SELECTOR`;
 * `completo` es `false` si quedaron contratos sin cargar.
 */
export async function listarTodosLosContratos(signal?: AbortSignal): Promise<{ contratos: Contrato[]; completo: boolean }> {
  const contratos: Contrato[] = []
  for (let pagina = 1; pagina <= PAGINAS_MAXIMAS_SELECTOR; pagina++) {
    const respuesta = await listarContratos({ page: pagina > 1 ? pagina : undefined }, signal)
    contratos.push(...respuesta.results)
    if (!respuesta.next) return { contratos, completo: true }
  }
  return { contratos, completo: false }
}

export function listarProveedores(consulta: ConsultaCatalogo & { activo?: boolean } = {}, signal?: AbortSignal) {
  return catalogo<Proveedor>('proveedores', { ...consulta }, signal)
}

export function listarTiposServicio(consulta: ConsultaCatalogo & { activo?: boolean; es_riesgo?: boolean } = {}, signal?: AbortSignal) {
  return catalogo<TipoServicio>('tipos-servicio', { ...consulta }, signal)
}

export function listarAreasVerdes(consulta: ConsultaCatalogo & { activo?: boolean } = {}, signal?: AbortSignal) {
  return catalogo<AreaVerde>('areas-verdes', { ...consulta }, signal)
}

export function listarEjemplares(consulta: ConsultaCatalogo & { area_verde_id?: number } = {}, signal?: AbortSignal) {
  return catalogo<Ejemplar>('ejemplares', { ...consulta }, signal)
}

export function listarUnidadesMedida(consulta: ConsultaCatalogo = {}, signal?: AbortSignal) {
  return catalogo<UnidadMedida>('unidades-medida', { ...consulta }, signal)
}

export function listarUnidadesInstitucionales(
  consulta: ConsultaCatalogo & { activo?: boolean; provisional?: boolean } = {},
  signal?: AbortSignal,
) {
  return catalogo<UnidadInstitucional>('unidades-institucionales', { ...consulta }, signal)
}
