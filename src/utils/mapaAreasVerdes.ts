import type { AreasVerdesGeoJSON } from '@/services/api/mapaInventario'
import type { PoligonoMapaAsignado } from '@/types/mapaInventario'

export interface ClasificacionMapa {
  id: string
  nombre: string
  cantidad: number
  color: string
  tipoUsoId: number | null
}

export function etiquetaClasificacionMapa(clasificacion: ClasificacionMapa): string {
  return clasificacion.tipoUsoId === null
    ? `${clasificacion.nombre} · categoría de origen`
    : clasificacion.nombre
}

export function enriquecerMapaAreasVerdes(
  geojson: AreasVerdesGeoJSON,
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
      const fichaVinculada = vinculacion?.area_verde_id != null
      const tipoFichaId = fichaVinculada ? vinculacion.area_verde_tipo_uso_id : null
      const tipoId = tipoFichaId
      const tipoNombre = tipoFichaId !== null
        ? vinculacion?.area_verde_tipo_uso_nombre ?? ''
        : ''
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

/** Devuelve el color de una clave sin depender del orden actual del catálogo. */
export function colorEstableClasificacion(clave: string, paleta: readonly string[]): string {
  if (paleta.length === 0) return ''
  let hash = 2166136261
  for (const caracter of clave) {
    hash ^= caracter.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return paleta[(hash >>> 0) % paleta.length]
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : typeof valor === 'number' ? String(valor) : ''
}
