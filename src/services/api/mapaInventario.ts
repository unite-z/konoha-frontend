import type { FeatureCollection, MultiPolygon } from 'geojson'
import { ErrorApi, MENSAJE_SIN_CONEXION } from './cliente'

export type PropiedadesAreaMapa = Record<string, number | string | null>
export type AreasVerdesGeoJSON = FeatureCollection<MultiPolygon, PropiedadesAreaMapa>

/** Carga la capa GeoJSON del campus servida como dato estático por el frontend. */
export async function cargarAreasVerdesGeoJSON(signal?: AbortSignal): Promise<AreasVerdesGeoJSON> {
  let respuesta: Response
  try {
    respuesta = await fetch(`${import.meta.env.BASE_URL}datos/areas-verdes.geojson`, {
      headers: { Accept: 'application/geo+json, application/json' },
      cache: 'force-cache',
      signal,
    })
  } catch (causa) {
    if (signal?.aborted) throw causa
    throw new ErrorApi(0, null, MENSAJE_SIN_CONEXION)
  }

  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, null, 'No pudimos cargar los polígonos del campus.')
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
