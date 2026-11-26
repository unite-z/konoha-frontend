import { campoApi, todosCampo } from '@/services/api/operacionCampo'
import type {
  ActividadCampo,
  CatalogoCampo,
  CuadrillaCampo,
  EncargoCampo,
  EntradaEncargo,
  PaginaCampo,
} from '@/types/operacionCampo'

export interface CatalogosEncargo {
  cuadrillas: CuadrillaCampo[]
  tipos: CatalogoCampo[]
  areas: CatalogoCampo[]
}

/** Opciones del formulario del encargo: cuadrillas (con su capataz), tipos de actividad y espacios. */
export async function cargarCatalogosEncargo(signal?: AbortSignal): Promise<CatalogosEncargo> {
  const [cuadrillas, tipos, areas] = await Promise.all([
    todosCampo<CuadrillaCampo>('cuadrillas/', {}, signal),
    todosCampo<CatalogoCampo>('catalogos/tipos-actividad/', {}, signal),
    todosCampo<CatalogoCampo>('catalogos/areas-verdes/', {}, signal),
  ])
  return { cuadrillas, tipos, areas }
}

/** Alta (`POST`) o edición (`PUT`) con solo los campos de entrada, nunca las etiquetas de una respuesta `GET`. */
export function guardarEncargo(entrada: EntradaEncargo, id?: number): Promise<Partial<EncargoCampo>> {
  const directo = entrada.periodicidad === 'Directo'
  return campoApi<Partial<EncargoCampo>>(`encargos/${id ? `${id}/` : ''}`, {
    metodo: id ? 'PUT' : 'POST',
    cuerpo: {
      cuadrilla_id: entrada.cuadrilla_id,
      tipo_actividad_id: entrada.tipo_actividad_id,
      area_verde_id: entrada.area_verde_id,
      descripcion: entrada.descripcion.trim(),
      periodicidad: entrada.periodicidad,
      ...(directo
        ? {}
        : {
            fecha_reunion: entrada.fecha_reunion,
            fecha_inicio: entrada.fecha_inicio,
            fecha_fin: entrada.fecha_fin,
          }),
      plazo_previsto: entrada.plazo_previsto,
    },
  })
}

/** Actividades registradas contra el encargo (`GET operacion-campo/actividades/?encargo_id=`). */
export function listarActividadesDeEncargo(
  encargoId: number,
  signal?: AbortSignal,
): Promise<PaginaCampo<ActividadCampo>> {
  return campoApi<PaginaCampo<ActividadCampo>>('actividades/', {
    parametros: { encargo_id: encargoId },
    signal,
  })
}
