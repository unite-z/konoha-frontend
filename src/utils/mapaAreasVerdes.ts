import type { AreasVerdesGeoJSON } from '@/services/api/mapaInventario'
import type { PoligonoMapaAsignado, UsoFuenteMapa } from '@/types/mapaInventario'

export interface ClasificacionMapa {
  id: string
  nombre: string
  cantidad: number
  color: string
  tipoUsoId: number | null
}

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
      const tipoFichaId = fichaVinculada ? vinculacion.area_verde_tipo_uso_id : null
      const tipoId = tipoFichaId ?? categoria?.tipo_uso_id ?? null
      const tipoNombre = tipoFichaId !== null
        ? vinculacion?.area_verde_tipo_uso_nombre ?? ''
        : categoria?.tipo_uso_nombre ?? ''
      const nombreClasificacion = tipoId === null ? usoFuente : tipoNombre
      return {
        ...feature,
        properties: {
          ...propiedades,
          inventario_nombre: fichaVinculada ? vinculacion.area_verde_nombre : null,
          inventario_superficie_m2: fichaVinculada ? vinculacion.area_verde_superficie_m2 : null,
          tipo_uso_id: tipoId,
          tipo_uso_nombre: nombreClasificacion,
          clasificacion_mapa_id: tipoId === null ? `origen:${usoFuente}` : `tipo:${tipoId}`,
          clasificacion_mapa_nombre: nombreClasificacion,
          tipo_uso_color:
            tipoId === null
              ? coloresOrigen.get(usoFuente) ?? null
              : coloresTipo.get(tipoId) ?? coloresOrigen.get(usoFuente) ?? null,
        },
      }
    }),
  }
}

export function listarClasificacionesMapa(geojson: AreasVerdesGeoJSON): ClasificacionMapa[] {
  const acumuladas = new Map<string, ClasificacionMapa>()
  for (const feature of geojson.features) {
    const propiedades = feature.properties ?? {}
    const id = texto(propiedades.clasificacion_mapa_id)
    if (!id) continue
    const actual = acumuladas.get(id)
    if (actual) {
      actual.cantidad += 1
      continue
    }
    const tipoUsoId = typeof propiedades.tipo_uso_id === 'number' ? propiedades.tipo_uso_id : null
    acumuladas.set(id, {
      id,
      nombre: texto(propiedades.clasificacion_mapa_nombre) || texto(propiedades.Uso),
      cantidad: 1,
      color: texto(propiedades.tipo_uso_color),
      tipoUsoId,
    })
  }
  return [...acumuladas.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

export function filtrarMapaPorClasificacion(
  geojson: AreasVerdesGeoJSON,
  idClasificacion: string,
): AreasVerdesGeoJSON {
  if (!idClasificacion) return geojson
  return {
    ...geojson,
    features: geojson.features.filter(
      (feature) => feature.properties?.clasificacion_mapa_id === idClasificacion,
    ),
  }
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : typeof valor === 'number' ? String(valor) : ''
}
