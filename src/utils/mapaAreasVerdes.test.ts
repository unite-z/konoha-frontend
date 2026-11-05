import { describe, expect, it } from 'vitest'
import type { AreasVerdesGeoJSON } from '@/services/api/mapaInventario'
import type { PoligonoMapaAsignado } from '@/types/mapaInventario'
import { enriquecerMapaAreasVerdes } from './mapaAreasVerdes'

const geojson: AreasVerdesGeoJSON = {
  type: 'FeatureCollection',
  features: [
    poligono('poligono-1', 'Recreativo'),
    poligono('poligono-2', 'Recreativo'),
    poligono('poligono-3', 'Recreativo'),
  ],
}

describe('enriquecerMapaAreasVerdes', () => {
  it('muestra la ficha individual y conserva la categoría original del GeoJSON', () => {
    const categorias = [{ uso_fuente: 'Recreativo', tipo_uso_id: 4, tipo_uso_nombre: 'Recreativo' }]
    const asignaciones = [ficha('poligono-1', 10, 'Jardín A', '125.50', 8, 'Ornamental')]
    const resultado = enriquecerMapaAreasVerdes(
      geojson,
      categorias,
      asignaciones,
      new Map([[4, '#abcdef'], [8, '#123456'], [9, '#654321']]),
      new Map([['Recreativo', '#abcdef']]),
    )

    expect(resultado.features.map((feature) => feature.properties?.Uso)).toEqual([
      'Recreativo', 'Recreativo', 'Recreativo',
    ])
    expect(resultado.features[0].properties).toMatchObject({
      Nombre: 'Nombre de origen poligono-1',
      inventario_nombre: 'Jardín A',
      inventario_superficie_m2: '125.50',
      tipo_uso_id: 8,
      tipo_uso_nombre: 'Ornamental',
      tipo_uso_color: '#123456',
    })
    expect(resultado.features[1].properties).toMatchObject({
      inventario_nombre: null,
      tipo_uso_id: 4,
      tipo_uso_nombre: 'Recreativo',
      tipo_uso_color: '#abcdef',
    })
  })

  it('actualiza un polígono al cambiar su ficha y no reclasifica al vecino', () => {
    const asignaciones = [
      ficha('poligono-1', 10, 'Jardín A', '125.50', 9, 'Institucional'),
      ficha('poligono-2', 20, 'Jardín B', '80.00', 8, 'Ornamental'),
    ]
    const resultado = enriquecerMapaAreasVerdes(
      geojson,
      [{ uso_fuente: 'Recreativo', tipo_uso_id: 4, tipo_uso_nombre: 'Recreativo' }],
      asignaciones,
      new Map([[8, '#123456'], [9, '#654321']]),
      new Map([['Recreativo', '#abcdef']]),
    )

    expect(resultado.features[0].properties).toMatchObject({ tipo_uso_id: 9, tipo_uso_nombre: 'Institucional' })
    expect(resultado.features[1].properties).toMatchObject({ tipo_uso_id: 8, tipo_uso_nombre: 'Ornamental' })
  })
})

function poligono(id: string, uso: string): AreasVerdesGeoJSON['features'][number] {
  return {
    type: 'Feature',
    properties: { mapa_id: id, Uso: uso, Nombre: `Nombre de origen ${id}`, Área: 100 },
    geometry: { type: 'MultiPolygon', coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]] },
  }
}

function ficha(
  idFuente: string,
  areaId: number,
  nombre: string,
  superficie: string,
  tipoId: number,
  tipoNombre: string,
): PoligonoMapaAsignado {
  return {
    id_fuente: idFuente,
    area_verde_id: areaId,
    area_verde_nombre: nombre,
    area_verde_superficie_m2: superficie,
    area_verde_tipo_uso_id: tipoId,
    area_verde_tipo_uso_nombre: tipoNombre,
  }
}
