import { campoApi, todosCampo } from './operacionCampo'
import { aErrorApi } from './cliente'
import type { CatalogoCampo, EntradaTipoActividadCampo, TipoActividadCampo } from '@/types/operacionCampo'

/** AV-62: contrato propuesto, pendiente de implementación en el backend. */
export const listarClasesActividad = (signal?: AbortSignal) =>
  todosCampo<CatalogoCampo>('catalogos/clases-actividad/', {}, signal)

export const listarTiposActividad = (soloActivos = false, signal?: AbortSignal) =>
  todosCampo<TipoActividadCampo>('catalogos/tipos-actividad/', soloActivos ? { activo: true } : {}, signal)

export const guardarTipoActividad = (entrada: EntradaTipoActividadCampo, id?: number, signal?: AbortSignal) =>
  campoApi<TipoActividadCampo>(`catalogos/tipos-actividad/${id === undefined ? '' : `${id}/`}`, {
    metodo: id === undefined ? 'POST' : 'PUT', cuerpo: entrada, signal,
  })

/** Conserva el registro actual contra el backend anterior, que no tiene clases. */
export async function clasesActividadParaParte(signal?: AbortSignal): Promise<CatalogoCampo[]> {
  try { return await listarClasesActividad(signal) }
  catch (causa) {
    if (aErrorApi(causa).estado === 404) return []
    throw causa
  }
}
