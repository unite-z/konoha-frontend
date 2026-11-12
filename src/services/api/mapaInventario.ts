import type { FeatureCollection, MultiPolygon } from 'geojson'
import { ErrorApi, enviarHttp } from './cliente'

export type PropiedadesAreaMapa = Record<string, number | string | null>
export type AreasVerdesGeoJSON = FeatureCollection<MultiPolygon, PropiedadesAreaMapa>

/** Carga la capa de referencia que utiliza la validación cartográfica. */
export async function cargarAreasVerdesGeoJSON(signal?: AbortSignal): Promise<AreasVerdesGeoJSON> {
  // Sin conexión o cancelación lo resuelve el cliente único. Un 401 no cierra la sesión (como antes).
  const opciones = { acepta: 'application/geo+json, application/json', signal, avisarSesion: false }
  let respuesta = await enviarHttp('mapa/geometria', { ...opciones, base: '/api/v1/inventario' })
  if (respuesta.status === 404) {
    respuesta = await enviarHttp('datos/areas-verdes.geojson', { ...opciones, base: import.meta.env.BASE_URL })
  }

  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, null, 'No pudimos cargar las áreas del mapa del campus.')
  }

  try {
    const geojson = (await respuesta.json()) as AreasVerdesGeoJSON
    if (geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
      throw new Error('El archivo no contiene una colección GeoJSON válida.')
    }
    return geojson
  } catch {
    throw new ErrorApi(500, null, 'Los datos del mapa no tienen un formato GeoJSON válido.')
  }
}
