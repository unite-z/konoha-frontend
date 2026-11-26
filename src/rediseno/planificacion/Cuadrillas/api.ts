import { campoApi, listarCuadrillasCampo, todosCampo } from '@/services/api/operacionCampo'
import type { CuadrillaCampo, EncargoCampo } from '@/types/operacionCampo'

/** Encargos cuyo periodo o plazo toca la semana (`GET operacion-campo/encargos/`, todas las páginas). */
export function listarEncargosDeSemana(desde: string, hasta: string, signal?: AbortSignal): Promise<EncargoCampo[]> {
  return todosCampo<EncargoCampo>('encargos/', { desde, hasta }, signal)
}

export function listarCuadrillas(signal?: AbortSignal): Promise<CuadrillaCampo[]> {
  return listarCuadrillasCampo(signal)
}

/** Cambia el encargo de cuadrilla con `PUT`, enviando solo los campos de entrada (como `DialogoEncargo`). */
export function cambiarDeCuadrilla(e: EncargoCampo, cuadrillaId: number): Promise<unknown> {
  const directo = e.periodicidad === 'Directo'
  return campoApi(`encargos/${e.id}/`, {
    metodo: 'PUT',
    cuerpo: {
      cuadrilla_id: cuadrillaId,
      tipo_actividad_id: e.tipo_actividad_id,
      area_verde_id: e.area_verde_id,
      descripcion: e.descripcion,
      periodicidad: e.periodicidad,
      ...(directo ? {} : { fecha_reunion: e.fecha_reunion, fecha_inicio: e.fecha_inicio, fecha_fin: e.fecha_fin }),
      plazo_previsto: e.plazo_previsto,
    },
  })
}

export function obtenerEncargo(id: number, signal?: AbortSignal): Promise<EncargoCampo> {
  return campoApi<EncargoCampo>(`encargos/${id}/`, { signal })
}
