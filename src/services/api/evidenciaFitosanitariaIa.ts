/**
 * Servicios de RF-IA-006: análisis de evidencia fitosanitaria con IA. Mismo cliente y misma base que RF-IA-001.
 * Para elegir el ejemplar, la atención especial o la plaga solo se leen servicios públicos de inventario y de MOD-05
 * (sin modificarlos); con datos simulados se usan listas locales.
 */
import { DATOS_SIMULADOS } from '@/config/datosSimulados'
import type { Paginado } from '@/types/comun'
import type {
  AtencionBuscable,
  CuerpoEvaluacionManual,
  CuerpoValidacionEvidencia,
  DatosSolicitudEvidencia,
  EjemplarEvidencia,
  PlagaCatalogo,
  SugerenciaEvidencia,
} from '@/types/evidenciaFitosanitariaIa'
import type { EstadoSugerencia } from '@/types/ia'
import { formularioEvidencia } from '@/utils/evidenciaFitosanitariaIa'
import { solicitar, solicitarBlob } from './cliente'
import { listarEjemplares } from './ejemplares'
import { listarAtencionesEspeciales, listarPlagas } from './maestrosTercerizados'

const BASE = 'ia/evidencias-fitosanitarias/'

/** `GET ia/evidencias-fitosanitarias/`: análisis, del más reciente al más antiguo. */
export async function listarAnalisisEvidencia(filtros: { estado?: EstadoSugerencia; page?: number } = {}, signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularListarEvidencias } = await import('../simulados/evidenciaFitosanitariaIa')
    return simularListarEvidencias(filtros, signal)
  }
  return solicitar<Paginado<SugerenciaEvidencia>>(BASE, { parametros: { ...filtros }, signal })
}

/** `POST ia/evidencias-fitosanitarias/` (multipart): pide el análisis de las fotografías a la IA (201). */
export async function solicitarAnalisisEvidencia(datos: DatosSolicitudEvidencia, archivos: File[]) {
  if (DATOS_SIMULADOS) {
    const { simularSolicitarEvidencia } = await import('../simulados/evidenciaFitosanitariaIa')
    return simularSolicitarEvidencia(datos, archivos)
  }
  return solicitar<SugerenciaEvidencia>(BASE, { metodo: 'POST', formulario: formularioEvidencia(datos, archivos) })
}

/** `GET ia/evidencias-fitosanitarias/{id}/`. */
export async function obtenerAnalisisEvidencia(id: number, signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularObtenerEvidencia } = await import('../simulados/evidenciaFitosanitariaIa')
    return simularObtenerEvidencia(id, signal)
  }
  return solicitar<SugerenciaEvidencia>(`${BASE}${id}/`, { signal })
}

/** `GET ia/evidencias-fitosanitarias/{id}/fotografias/{archivo_id}/`: la imagen como blob, con la sesión. */
export async function obtenerFotografia(id: number, archivoId: number, signal?: AbortSignal): Promise<Blob> {
  if (DATOS_SIMULADOS) {
    const { simularObtenerFotografia } = await import('../simulados/evidenciaFitosanitariaIa')
    return simularObtenerFotografia(id, archivoId, signal)
  }
  return solicitarBlob(`${BASE}${id}/fotografias/${archivoId}/`, signal)
}

/** `POST ia/evidencias-fitosanitarias/{id}/validar/`: registra la categoría validada y conserva la salida de la IA. */
export async function validarEvidencia(id: number, cuerpo: CuerpoValidacionEvidencia) {
  if (DATOS_SIMULADOS) {
    const { simularValidarEvidencia } = await import('../simulados/evidenciaFitosanitariaIa')
    return simularValidarEvidencia(id, cuerpo)
  }
  return solicitar<SugerenciaEvidencia>(`${BASE}${id}/validar/`, { metodo: 'POST', cuerpo })
}

/** `POST ia/evidencias-fitosanitarias/{id}/rechazar/`: descarta el análisis. */
export async function descartarEvidencia(id: number, motivo: string | null) {
  if (DATOS_SIMULADOS) {
    const { simularDescartarEvidencia } = await import('../simulados/evidenciaFitosanitariaIa')
    return simularDescartarEvidencia(id, motivo)
  }
  return solicitar<SugerenciaEvidencia>(`${BASE}${id}/rechazar/`, { metodo: 'POST', cuerpo: { motivo: motivo || null } })
}

/** `POST ia/evidencias-fitosanitarias/manual/` (E1 y A1): evaluación sin IA; funciona aunque no esté disponible. */
export async function registrarEvaluacionManual(cuerpo: CuerpoEvaluacionManual) {
  if (DATOS_SIMULADOS) {
    const { simularRegistrarEvaluacionManual } = await import('../simulados/evidenciaFitosanitariaIa')
    return simularRegistrarEvaluacionManual(cuerpo)
  }
  return solicitar<SugerenciaEvidencia>(`${BASE}manual/`, { metodo: 'POST', cuerpo })
}

/** Ejemplares por código, especie o ubicación (lectura del inventario). */
export async function buscarEjemplaresEvidencia(q: string, signal?: AbortSignal): Promise<Paginado<EjemplarEvidencia>> {
  if (DATOS_SIMULADOS) {
    const { simularBuscarEjemplares } = await import('../simulados/evidenciaFitosanitariaIa')
    return simularBuscarEjemplares(q, signal)
  }
  const ejemplares = await listarEjemplares(q, 1, signal)
  const results = ejemplares.map((e) => ({ id: e.id, codigo: e.codigo, especie: e.especie_nombre_comun, espacio: e.ubicacion }))
  return { count: results.length, next: null, previous: null, results }
}

/** Atenciones fitosanitarias especiales (lectura de MOD-05). */
export async function buscarAtencionesEvidencia(q: string, signal?: AbortSignal): Promise<Paginado<AtencionBuscable>> {
  if (DATOS_SIMULADOS) {
    const { simularBuscarAtenciones } = await import('../simulados/evidenciaFitosanitariaIa')
    return simularBuscarAtenciones(q, signal)
  }
  const pagina = await listarAtencionesEspeciales({ q }, 1, signal)
  return {
    ...pagina,
    results: pagina.results.map((a) => ({
      id: a.id,
      plaga: a.plaga_nombre,
      // SUPUESTO: la atención no trae la especie; se completa al analizar (el backend la lee del ejemplar).
      ejemplar: { id: a.ejemplar_id, codigo: a.ejemplar_codigo, especie: null, espacio: a.area_verde_nombre },
    })),
  }
}

/** Plagas activas del catálogo (lectura de MOD-05). */
export async function buscarPlagas(q: string, signal?: AbortSignal): Promise<Paginado<PlagaCatalogo>> {
  if (DATOS_SIMULADOS) {
    const { simularBuscarPlagas } = await import('../simulados/evidenciaFitosanitariaIa')
    return simularBuscarPlagas(q, signal)
  }
  const pagina = await listarPlagas({ q, activo: true }, signal)
  return { ...pagina, results: pagina.results.map((p) => ({ id: p.id, nombre: p.nombre })) }
}
