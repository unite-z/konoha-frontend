/**
 * Servicios de RF-IA-002: revisión de posibles inconsistencias de datos con IA (`SugerenciaIA` de tipo
 * `Inconsistencia`, una por hallazgo). Mismo cliente y misma base que RF-IA-001 (`ia.ts`).
 *
 * SUPUESTO (pendiente de confirmar con el backend): aceptar no modifica el registro oficial desde MOD-06. El
 * hallazgo pasa a `Validada` con la decisión; la corrección la hace el módulo dueño del registro.
 */
import { DATOS_SIMULADOS } from '../../config/datosSimulados'
import type { Paginado } from '../../types/comun'
import type {
  CuerpoAceptarInconsistencia,
  FiltrosInconsistencias,
  ResultadoAnalisisInconsistencias,
  SolicitudAnalisisInconsistencias,
  SugerenciaInconsistencia,
} from '../../types/inconsistenciasIa'
import { solicitar } from './cliente'

/** `POST ia/inconsistencias/analisis/`: la IA analiza un conjunto de datos. Puede tardar. */
export async function analizarInconsistencias(cuerpo: SolicitudAnalisisInconsistencias) {
  if (DATOS_SIMULADOS) {
    const { simularAnalizarInconsistencias } = await import('../simulados/inconsistenciasIa')
    return simularAnalizarInconsistencias(cuerpo)
  }
  return solicitar<ResultadoAnalisisInconsistencias>('ia/inconsistencias/analisis/', { metodo: 'POST', cuerpo })
}

/** `GET ia/inconsistencias/`: bandeja paginada, de la más reciente a la más antigua. */
export async function listarInconsistencias(filtros: FiltrosInconsistencias = {}, signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularListarInconsistencias } = await import('../simulados/inconsistenciasIa')
    return simularListarInconsistencias(filtros, signal)
  }
  return solicitar<Paginado<SugerenciaInconsistencia>>('ia/inconsistencias/', { parametros: { ...filtros }, signal })
}

/** `GET ia/inconsistencias/{id}/`. */
export async function obtenerInconsistencia(id: number, signal?: AbortSignal) {
  if (DATOS_SIMULADOS) {
    const { simularObtenerInconsistencia } = await import('../simulados/inconsistenciasIa')
    return simularObtenerInconsistencia(id, signal)
  }
  return solicitar<SugerenciaInconsistencia>(`ia/inconsistencias/${id}/`, { signal })
}

/** `POST ia/inconsistencias/{id}/validar/`: acepta la propuesta (con el valor final corregido, si lo hay). */
export async function aceptarInconsistencia(id: number, cuerpo: CuerpoAceptarInconsistencia) {
  if (DATOS_SIMULADOS) {
    const { simularAceptarInconsistencia } = await import('../simulados/inconsistenciasIa')
    return simularAceptarInconsistencia(id, cuerpo)
  }
  return solicitar<SugerenciaInconsistencia>(`ia/inconsistencias/${id}/validar/`, { metodo: 'POST', cuerpo })
}

/** `POST ia/inconsistencias/{id}/rechazar/`: descarta la propuesta. */
export async function descartarInconsistencia(id: number, motivo: string | null) {
  if (DATOS_SIMULADOS) {
    const { simularDescartarInconsistencia } = await import('../simulados/inconsistenciasIa')
    return simularDescartarInconsistencia(id, motivo)
  }
  return solicitar<SugerenciaInconsistencia>(`ia/inconsistencias/${id}/rechazar/`, { metodo: 'POST', cuerpo: { motivo: motivo || null } })
}
