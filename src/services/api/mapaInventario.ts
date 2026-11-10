import type { FeatureCollection, MultiPolygon } from 'geojson'
import { ErrorApi, MENSAJE_SIN_CONEXION } from './cliente'

export type PropiedadesAreaMapa = Record<string, number | string | null>
export type AreasVerdesGeoJSON = FeatureCollection<MultiPolygon, PropiedadesAreaMapa>

/** Carga la capa de referencia que utiliza la validación cartográfica. */
export async function cargarAreasVerdesGeoJSON(signal?: AbortSignal): Promise<AreasVerdesGeoJSON> {
  let respuesta: Response
  try {
    const opciones = { headers: { Accept: 'application/geo+json, application/json' }, signal }
    respuesta = await fetch('/api/v1/inventario/mapa/geometria', opciones)
    if (respuesta.status === 404) {
      respuesta = await fetch(`${import.meta.env.BASE_URL}datos/areas-verdes.geojson`, opciones)
    }
  } catch (causa) {
    if (signal?.aborted) throw causa
    throw new ErrorApi(0, null, MENSAJE_SIN_CONEXION)
  }

  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, null, 'No pudimos cargar las áreas del mapa del campus.')
  }

  try {
    const geojson = await respuesta.json() as AreasVerdesGeoJSON
    if (geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
      throw new Error('El archivo no contiene una colección GeoJSON válida.')
    }
    return geojson
  } catch {
    throw new ErrorApi(500, null, 'Los datos del mapa no tienen un formato GeoJSON válido.')
  }
}
