import { describe, expect, it } from 'vitest'
import type { AreasVerdesGeoJSON } from '@/services/api/mapaInventario'
import type { PoligonoMapaAsignado } from '@/types/mapaInventario'
import { enriquecerGeoJSON, nombrePoligonoMapa, obtenerClasificacionPoligono, obtenerTiposEfectivos } from './clasificacionMapa'

const geojson: AreasVerdesGeoJSON = {
  type: 'FeatureCollection',
  features: ['a', 'b', 'c'].map((id) => ({
    type: 'Feature' as const,
    properties: { mapa_id: id, Uso: 'Jardín', Área: 100 },
    geometry: { type: 'MultiPolygon' as const, coordinates: [] },
  })),
}

function asignacion(id: string, areaId: number, nombre: string, tipoId: number | null, tipoNombre: string | null, activa = true): PoligonoMapaAsignado {
  return {
    id_fuente: id,
    area_verde_id: areaId,
    area_verde_nombre: nombre,
    area_verde_tipo_uso_id: tipoId,
    area_verde_tipo_uso_nombre: tipoNombre,
    superficie_registrada_m2: '85.50',
    area_verde_activa: activa,
  }
}

describe('clasificación efectiva del mapa', () => {
  it('prioriza el nombre del área, el nombre original y el nombre genérico', () => {
    const conNombres = { ...geojson, features: geojson.features.map((feature, indice) => ({
      ...feature, properties: { ...feature.properties, Nombre: ['Nombre anterior', 'Jardín Rosales', ''][indice] },
    })) }
    const mapa = enriquecerGeoJSON(conNombres, [asignacion('a', 1, 'Bosque Húmedo', null, null)])
    expect(mapa.features.map(nombrePoligonoMapa)).toEqual(['Bosque Húmedo', 'Jardín Rosales', 'Área verde del campus'])
  })

  it('prioriza el tipo del área y usa el Uso original sin vínculo o con área inactiva', () => {
    expect(obtenerClasificacionPoligono('Jardín', asignacion('a', 1, 'A', 10, 'Ornamental'))).toMatchObject({
      tipoUsoEfectivo: 'Ornamental',
      origenClasificacion: 'area-vinculada',
    })
    expect(obtenerClasificacionPoligono('Jardín', asignacion('b', 2, 'B', 20, 'Deportivo'))).toMatchObject({
      tipoUsoEfectivo: 'Deportivo',
      origenClasificacion: 'area-vinculada',
    })
    expect(obtenerClasificacionPoligono('Jardín', undefined)).toMatchObject({
      tipoUsoEfectivo: 'Jardín',
      origenClasificacion: 'uso-original',
    })
    expect(obtenerClasificacionPoligono('Jardín', asignacion('c', 3, 'C', 30, 'Institucional', false))).toMatchObject({
      tipoUsoEfectivo: 'Jardín',
      origenClasificacion: 'uso-original',
    })
  })

  it('mantiene clasificaciones independientes y permite recuperar el fallback al desvincular', () => {
    const efectivo = enriquecerGeoJSON(geojson, [
      asignacion('a', 1, 'A', 10, 'Ornamental'),
      asignacion('b', 2, 'B', 20, 'Deportivo'),
    ])
    expect(efectivo.features.map((feature) => feature.properties?.clasificacion_efectiva)).toEqual([
      'Ornamental', 'Deportivo', 'Jardín',
    ])
    expect(obtenerTiposEfectivos(efectivo)).toEqual(['Deportivo', 'Jardín', 'Ornamental'])

    const desvinculado = enriquecerGeoJSON(geojson, [asignacion('b', 2, 'B', 20, 'Deportivo')])
    expect(desvinculado.features[0].properties?.clasificacion_efectiva).toBe('Jardín')
  })
})
