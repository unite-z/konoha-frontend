/**
 * Servicios de incidencias de MOD-03 (AV-274 y siguientes). Base prevista: `/api/v1/planificacion/incidencias/`.
 * El backend aún no existe: con `VITE_DATOS_SIMULADOS=true` responden los datos simulados (D9).
 */
import { DATOS_SIMULADOS } from '@/config/datosSimulados'
import type { CatalogosRegistro, NuevaIncidencia, PosibleDuplicado, CapatazDisponible, Clasificacion, IncidenciaDetalle, IncidenciaResumen, Inspector, NuevoEncargo, NuevoRequerimiento, ProveedorIncidencia, SolicitudInspeccion } from '@/types/incidencias'
import { solicitarPlanificacion } from './clientePlanificacion'

/** `GET incidencias/`: bandeja del jefe, de la más reciente a la más antigua. */
export async function listarIncidencias(signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularListarIncidencias } = await import('../simulados/incidencias')
    return simularListarIncidencias(signal)
  }
  return solicitarPlanificacion<IncidenciaResumen[]>('incidencias/', { signal })
}

/** `POST incidencias/{id}/causa-retraso/` (AV-280): causa del retraso de una alerta de plazo, con autor. */
export async function anotarCausaRetraso(incidenciaId: number, causa: string) {
  if (DATOS_SIMULADOS) {
    const { simularRespuestaVacia } = await import('../simulados/incidencias')
    return simularRespuestaVacia()
  }
  return solicitarPlanificacion<void>(`incidencias/${incidenciaId}/causa-retraso/`, { metodo: 'POST', cuerpo: { causa } })
}

/**
 * `GET incidencias/{id}/capataces/?fecha=` (AV-280 y AV-277): capataces a los que se puede reasignar o encargar la
 * incidencia; con `fecha`, con la carga de su cuadrilla ese día.
 */
export async function listarCapatacesDisponibles(incidenciaId: number, signal?: AbortSignal, fecha?: string) {
  if (DATOS_SIMULADOS) {
    const { simularCapataces } = await import('../simulados/incidencias')
    return simularCapataces(signal, fecha)
  }
  return solicitarPlanificacion<CapatazDisponible[]>(`incidencias/${incidenciaId}/capataces/`, { parametros: { fecha }, signal })
}

/** `GET incidencias/actividades/` (AV-277): actividades de campo que puede llevar un encargo. */
export async function listarActividadesEncargo(signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularActividades } = await import('../simulados/incidencias')
    return simularActividades(signal)
  }
  return solicitarPlanificacion<string[]>('incidencias/actividades/', { signal })
}

/** `POST incidencias/{id}/encargo/` (AV-277): crea el encargo al capataz; devuelve la incidencia Derivada · interna. */
export async function crearEncargo(incidenciaId: number, cuerpo: NuevoEncargo) {
  if (DATOS_SIMULADOS) {
    const { simularEncargo } = await import('../simulados/incidencias')
    return simularEncargo(incidenciaId, cuerpo)
  }
  return solicitarPlanificacion<IncidenciaDetalle>(`incidencias/${incidenciaId}/encargo/`, { metodo: 'POST', cuerpo })
}

/** `POST incidencias/{id}/reasignar/` (AV-280): cambia el capataz a cargo; devuelve la incidencia actualizada. */
export async function reasignarIncidencia(incidenciaId: number, capatazId: number) {
  if (DATOS_SIMULADOS) {
    const { simularReasignar } = await import('../simulados/incidencias')
    return simularReasignar(incidenciaId, capatazId)
  }
  return solicitarPlanificacion<IncidenciaResumen>(`incidencias/${incidenciaId}/reasignar/`, { metodo: 'POST', cuerpo: { capataz_id: capatazId } })
}

/** `GET incidencias/{id}/` (AV-274): ficha con la ubicación, el ejemplar, la descripción y quién la reportó. */
export async function obtenerIncidencia(id: number, signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularObtenerIncidencia } = await import('../simulados/incidencias')
    return simularObtenerIncidencia(id, signal)
  }
  return solicitarPlanificacion<IncidenciaDetalle>(`incidencias/${id}/`, { signal })
}

/** `POST incidencias/{id}/clasificar/` (AV-276): severidad, impacto y vía; devuelve la incidencia Clasificada. */
export async function clasificarIncidencia(id: number, cuerpo: Clasificacion) {
  if (DATOS_SIMULADOS) {
    const { simularClasificar } = await import('../simulados/incidencias')
    return simularClasificar(id, cuerpo)
  }
  return solicitarPlanificacion<IncidenciaDetalle>(`incidencias/${id}/clasificar/`, { metodo: 'POST', cuerpo })
}

/** `POST incidencias/{id}/descartar/` (AV-276): con motivo; devuelve la incidencia Descartada. */
export async function descartarIncidencia(id: number, motivo: string) {
  if (DATOS_SIMULADOS) {
    const { simularDescartar } = await import('../simulados/incidencias')
    return simularDescartar(id)
  }
  return solicitarPlanificacion<IncidenciaDetalle>(`incidencias/${id}/descartar/`, { metodo: 'POST', cuerpo: { motivo } })
}

/** `GET incidencias/inspectores/` (AV-276): ingenieros y practicantes que pueden inspeccionar en campo. */
export async function listarInspectores(signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularInspectores } = await import('../simulados/incidencias')
    return simularInspectores(signal)
  }
  return solicitarPlanificacion<Inspector[]>('incidencias/inspectores/', { signal })
}

/** `POST incidencias/{id}/inspeccion/` (AV-276): pide la inspección en campo; la incidencia sigue Registrada. */
export async function solicitarInspeccion(id: number, cuerpo: SolicitudInspeccion) {
  if (DATOS_SIMULADOS) {
    const { simularRespuestaVacia } = await import('../simulados/incidencias')
    return simularRespuestaVacia()
  }
  return solicitarPlanificacion<void>(`incidencias/${id}/inspeccion/`, { metodo: 'POST', cuerpo })
}

/** `GET incidencias/{id}/proveedores/` (AV-278): proveedores con sus contratos para la vía tercerizada. */
export async function listarProveedoresIncidencia(incidenciaId: number, signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularProveedores } = await import('../simulados/incidencias')
    return simularProveedores(signal)
  }
  return solicitarPlanificacion<ProveedorIncidencia[]>(`incidencias/${incidenciaId}/proveedores/`, { signal })
}

/** `POST incidencias/{id}/requerimiento/` (AV-278): requerimiento al proveedor; devuelve la incidencia Derivada · tercerizada. */
export async function crearRequerimiento(incidenciaId: number, cuerpo: NuevoRequerimiento) {
  if (DATOS_SIMULADOS) {
    const { simularRequerimiento } = await import('../simulados/incidencias')
    return simularRequerimiento(incidenciaId, cuerpo)
  }
  return solicitarPlanificacion<IncidenciaDetalle>(`incidencias/${incidenciaId}/requerimiento/`, { metodo: 'POST', cuerpo })
}

/** `POST incidencias/{id}/cerrar/` (AV-279): cierra una atendida con evidencia; 409 `sin-evidencia` si no la tiene. */
export async function cerrarIncidencia(incidenciaId: number, observaciones?: string) {
  if (DATOS_SIMULADOS) {
    const { simularCerrar } = await import('../simulados/incidencias')
    return simularCerrar(incidenciaId)
  }
  return solicitarPlanificacion<IncidenciaDetalle>(`incidencias/${incidenciaId}/cerrar/`, { metodo: 'POST', cuerpo: { observaciones } })
}

/** `POST incidencias/{id}/devolver/` (AV-279): la devuelve a En atención con observaciones obligatorias. */
export async function devolverIncidencia(incidenciaId: number, observaciones: string) {
  if (DATOS_SIMULADOS) {
    const { simularDevolver } = await import('../simulados/incidencias')
    return simularDevolver(incidenciaId)
  }
  return solicitarPlanificacion<IncidenciaDetalle>(`incidencias/${incidenciaId}/devolver/`, { metodo: 'POST', cuerpo: { observaciones } })
}

/** `GET incidencias/catalogos-registro/` (AV-274): tipos, espacios con sus ejemplares y usuarios para el registro. */
export async function obtenerCatalogosRegistro(signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularCatalogosRegistro } = await import('../simulados/incidencias')
    return simularCatalogosRegistro(signal)
  }
  return solicitarPlanificacion<CatalogosRegistro>('incidencias/catalogos-registro/', { signal })
}

/**
 * `POST incidencias/` (AV-274): registra la incidencia en nombre de otro; con foto, en multipart (`datos` en JSON y
 * `foto`). Devuelve la incidencia Registrada.
 */
export async function registrarIncidencia(cuerpo: NuevaIncidencia, foto: File | null) {
  if (DATOS_SIMULADOS) {
    const { simularRegistrarIncidencia } = await import('../simulados/incidencias')
    return simularRegistrarIncidencia(cuerpo)
  }
  if (foto) {
    const formulario = new FormData()
    formulario.append('datos', JSON.stringify(cuerpo))
    formulario.append('foto', foto)
    return solicitarPlanificacion<IncidenciaDetalle>('incidencias/', { metodo: 'POST', formulario })
  }
  return solicitarPlanificacion<IncidenciaDetalle>('incidencias/', { metodo: 'POST', cuerpo })
}

/** `GET incidencias/mias/` (AV-274 y AV-279): las incidencias que reportó el usuario, de la más reciente a la más antigua. */
export async function listarMisIncidencias(signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularMisIncidencias } = await import('../simulados/incidencias')
    return simularMisIncidencias(signal)
  }
  return solicitarPlanificacion<IncidenciaResumen[]>('incidencias/mias/', { signal })
}

/** `GET incidencias/posibles-duplicados/?tipo&espacio&ejemplar` (AV-274): abiertas del mismo tipo en el mismo sitio. */
export async function buscarPosiblesDuplicados(tipo: string, espacio: string, ejemplar: string | null, signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularPosiblesDuplicados } = await import('../simulados/incidencias')
    return simularPosiblesDuplicados(tipo, espacio, signal)
  }
  return solicitarPlanificacion<PosibleDuplicado[]>('incidencias/posibles-duplicados/', { parametros: { tipo, espacio, ejemplar }, signal })
}

/** `POST incidencias/{id}/reportes/` (AV-274): suma el reporte (descripción y foto) a una incidencia abierta. */
export async function sumarReporte(incidenciaId: number, descripcion: string, foto: File | null) {
  if (DATOS_SIMULADOS) {
    const { simularRespuestaVacia } = await import('../simulados/incidencias')
    return simularRespuestaVacia()
  }
  const formulario = new FormData()
  formulario.append('descripcion', descripcion)
  if (foto) formulario.append('foto', foto)
  return solicitarPlanificacion<void>(`incidencias/${incidenciaId}/reportes/`, { metodo: 'POST', formulario })
}
