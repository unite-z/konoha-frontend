import type { AreasVerdesGeoJSON } from '@/services/api/mapaInventario'
import type { PoligonoMapaAsignado } from '@/types/mapaInventario'

export type OrigenClasificacion = 'area-vinculada' | 'uso-original'

export interface ClasificacionPoligono {
  usoOriginal: string
  tipoUsoEfectivoId: number | null
  tipoUsoEfectivo: string
  origenClasificacion: OrigenClasificacion
  areaVinculada: PoligonoMapaAsignado | null
}

export interface TipoUsoMapa {
  id: number
  nombre: string
  color: string
}

export function construirIndicePoligonos(asignaciones: PoligonoMapaAsignado[]) {
  return new Map(asignaciones.map((asignacion) => [asignacion.id_fuente, asignacion]))
}

export function obtenerClasificacionPoligono(
  usoOriginal: string,
  asignacion: PoligonoMapaAsignado | undefined,
): ClasificacionPoligono {
  const tieneTipoActivo = Boolean(
    asignacion?.area_verde_id
      && asignacion.area_verde_activa !== false
      && asignacion.area_verde_tipo_uso_id
      && asignacion.area_verde_tipo_uso_nombre,
  )
  return {
    usoOriginal,
    tipoUsoEfectivoId: tieneTipoActivo ? asignacion?.area_verde_tipo_uso_id ?? null : null,
    tipoUsoEfectivo: tieneTipoActivo ? asignacion?.area_verde_tipo_uso_nombre ?? usoOriginal : usoOriginal,
    origenClasificacion: tieneTipoActivo ? 'area-vinculada' : 'uso-original',
    areaVinculada: asignacion ?? null,
  }
}

export function enriquecerGeoJSON(
  geojson: AreasVerdesGeoJSON,
  asignaciones: PoligonoMapaAsignado[],
): AreasVerdesGeoJSON {
  const indice = construirIndicePoligonos(asignaciones)
  return {
    ...geojson,
    features: geojson.features.map((feature) => {
      const idFuente = texto(feature.properties?.mapa_id)
      const usoFuente = texto(feature.properties?.Uso)
      const asignacion = indice.get(idFuente)
      const clasificacion = obtenerClasificacionPoligono(usoFuente || 'Sin uso', asignacion)
      return {
        ...feature,
        properties: {
          ...feature.properties,
          nombre_visible: asignacion?.area_verde_nombre || texto(feature.properties?.Nombre),
          clasificacion_efectiva: clasificacion.tipoUsoEfectivo,
          origen_clasificacion: clasificacion.origenClasificacion,
        },
      }
    }),
  }
}

export function obtenerTiposEfectivos(geojson: AreasVerdesGeoJSON): string[] {
  return [...new Set(geojson.features
    .map((feature) => texto(feature.properties?.clasificacion_efectiva) || texto(feature.properties?.Uso))
    .filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'))
}

export function nombrePoligonoMapa(poligono: AreasVerdesGeoJSON['features'][number]) {
  return texto(poligono.properties.nombre_visible) || texto(poligono.properties.Nombre) || 'Área verde del campus'
}

export function nombreUsoMapa(poligono: AreasVerdesGeoJSON['features'][number]) {
  return texto(poligono.properties.clasificacion_efectiva) || texto(poligono.properties.Uso) || 'Sin uso'
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : typeof valor === 'number' ? String(valor) : ''
}
