import type { AreasVerdesGeoJSON } from '@/services/api/mapaInventario'
import type { PoligonoMapaAsignado, UsoFuenteMapa } from '@/types/mapaInventario'

export function enriquecerMapaAreasVerdes(
  geojson: AreasVerdesGeoJSON,
  categorias: UsoFuenteMapa[],
  asignaciones: PoligonoMapaAsignado[],
  coloresTipo: ReadonlyMap<number, string>,
  coloresOrigen: ReadonlyMap<string, string>,
): AreasVerdesGeoJSON {
  const asignacionesPorId = new Map(asignaciones.map((asignacion) => [asignacion.id_fuente, asignacion]))
  return {
    ...geojson,
    features: geojson.features.map((feature) => {
      const propiedades = feature.properties ?? {}
      const usoFuente = texto(propiedades.Uso)
      const vinculacion = asignacionesPorId.get(texto(propiedades.mapa_id))
      const categoria = categorias.find((item) => item.uso_fuente === usoFuente)
      const fichaVinculada = vinculacion?.area_verde_id != null
      const tipoId = fichaVinculada ? vinculacion.area_verde_tipo_uso_id : categoria?.tipo_uso_id ?? null
      return {
        ...feature,
        properties: {
          ...propiedades,
          inventario_nombre: fichaVinculada ? vinculacion.area_verde_nombre : null,
          inventario_superficie_m2: fichaVinculada ? vinculacion.area_verde_superficie_m2 : null,
          tipo_uso_id: tipoId,
          tipo_uso_nombre: fichaVinculada
            ? vinculacion.area_verde_tipo_uso_nombre ?? ''
            : categoria?.tipo_uso_nombre ?? '',
          tipo_uso_color:
            tipoId === null
              ? coloresOrigen.get(usoFuente) ?? null
              : coloresTipo.get(tipoId) ?? null,
        },
      }
    }),
  }
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : typeof valor === 'number' ? String(valor) : ''
}
