import { describe, expect, it } from 'vitest'
import type { AreasVerdesGeoJSON } from '@/services/api/mapaInventario'
import type { PoligonoMapaAsignado } from '@/types/mapaInventario'
import { enriquecerMapaAreasVerdes, filtrarMapaPorClasificacion, listarClasificacionesMapa } from './mapaAreasVerdes'

const geojson: AreasVerdesGeoJSON = {
  type: 'FeatureCollection',
  features: [
    poligono('poligono-1', 'Recreativo'),
    poligono('poligono-2', 'Recreativo'),
    poligono('poligono-3', 'Recreativo'),
  ],
}
const geojsonConCuatroPoligonos: AreasVerdesGeoJSON = {
  ...geojson,
  features: [...geojson.features, poligono('poligono-4', 'Recreativo')],
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

  it('unifica filtro, leyenda y conteos por tipo efectivo y refresca solo el polígono cambiado', () => {
    const tipos = new Map([[8, '#123456'], [99, '#654321']])
    const coloresOrigen = new Map([['Recreativo', '#abcdef']])
    const asignacionesIniciales = [
      ficha('poligono-1', 10, 'Jardín A', '125.50', 99, 'Nuevo tipo'),
      ficha('poligono-2', 20, 'Jardín B', '80.00', 8, 'Ornamental'),
      ficha('poligono-3', 30, 'Jardín C', '40.00', 0, ''),
    ].map((asignacion) => asignacion.area_verde_id === 30
      ? { ...asignacion, area_verde_tipo_uso_id: null }
      : asignacion)
    const inicial = enriquecerMapaAreasVerdes(geojsonConCuatroPoligonos, [], asignacionesIniciales, tipos, coloresOrigen)
    const clasesIniciales = listarClasificacionesMapa(inicial)

    expect(clasesIniciales).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'tipo:99', nombre: 'Nuevo tipo', cantidad: 1 }),
      expect.objectContaining({ id: 'tipo:8', nombre: 'Ornamental', cantidad: 1 }),
      expect.objectContaining({ id: 'origen:Recreativo', nombre: 'Recreativo', cantidad: 2 }),
    ]))
    expect(filtrarMapaPorClasificacion(inicial, 'tipo:99').features.map((feature) => feature.properties?.mapa_id))
      .toEqual(['poligono-1'])
    expect(filtrarMapaPorClasificacion(inicial, 'tipo:8').features.map((feature) => feature.properties?.mapa_id))
      .toEqual(['poligono-2'])

    const asignacionesActualizadas = [
      ficha('poligono-1', 10, 'Jardín A', '125.50', 8, 'Ornamental'),
      ...asignacionesIniciales.slice(1),
    ]
    const actualizado = enriquecerMapaAreasVerdes(geojsonConCuatroPoligonos, [], asignacionesActualizadas, tipos, coloresOrigen)
    const clasesActualizadas = listarClasificacionesMapa(actualizado)

    expect(clasesActualizadas).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'tipo:8', nombre: 'Ornamental', cantidad: 2 }),
      expect.objectContaining({ id: 'origen:Recreativo', nombre: 'Recreativo', cantidad: 2 }),
    ]))
    expect(clasesActualizadas).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'tipo:99', nombre: 'Nuevo tipo' }),
    ]))
    expect(actualizado.features[1].properties).toMatchObject({
      clasificacion_mapa_id: inicial.features[1].properties?.clasificacion_mapa_id,
      tipo_uso_color: inicial.features[1].properties?.tipo_uso_color,
    })
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
