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
      const clasificacion = obtenerClasificacionPoligono(
        texto(feature.properties?.Uso) || 'Sin uso',
        idFuente ? indice.get(idFuente) : undefined,
      )
      return {
        ...feature,
        properties: {
          ...feature.properties,
          clasificacion_efectiva: clasificacion.tipoUsoEfectivo,
          tipo_uso_efectivo_id: clasificacion.tipoUsoEfectivoId,
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

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : typeof valor === 'number' ? String(valor) : ''
}
