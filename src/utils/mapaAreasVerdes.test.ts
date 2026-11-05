import { describe, expect, it } from 'vitest'
import type { AreasVerdesGeoJSON } from '@/services/api/mapaInventario'
import type { PoligonoMapaAsignado } from '@/types/mapaInventario'
import { colorEstableClasificacion, enriquecerMapaAreasVerdes, etiquetaClasificacionMapa, filtrarMapaPorClasificacion, listarClasificacionesMapa } from './mapaAreasVerdes'

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
    const asignaciones = [ficha('poligono-1', 10, 'Jardín A', '125.50', 8, 'Ornamental')]
    const resultado = enriquecerMapaAreasVerdes(
      geojson,
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
      tipo_uso_id: null,
      tipo_uso_nombre: 'Recreativo',
      clasificacion_mapa_id: 'origen:Recreativo',
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
    const inicial = enriquecerMapaAreasVerdes(geojsonConCuatroPoligonos, asignacionesIniciales, tipos, coloresOrigen)
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
    const actualizado = enriquecerMapaAreasVerdes(geojsonConCuatroPoligonos, asignacionesActualizadas, tipos, coloresOrigen)
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

  it('separa nombres iguales de origen y catálogo en tres polígonos y conserva colores al recargar', () => {
    const tres = { ...geojson, features: geojson.features.slice(0, 3).map((feature) => ({
      ...feature,
      properties: { ...feature.properties, Uso: 'Ornamental' },
    })) }
    const paleta = ['#117799', '#991177', '#779911']
    const tiposCatalogo = new Map([
      [7, colorEstableClasificacion('tipo:7', paleta)],
      [8, colorEstableClasificacion('tipo:8', paleta)],
    ])
    const coloresOrigen = new Map([['Ornamental', colorEstableClasificacion('origen:Ornamental', paleta)]])
    const equivalenciasReferencia = [{ uso_fuente: 'Ornamental', tipo_uso_id: 7, tipo_uso_nombre: 'Ornamental' }]
    const dosFichas = [
      ficha('poligono-1', 10, 'Jardín A', '125.50', 7, 'Ornamental'),
      ficha('poligono-2', 20, 'Jardín B', '80.00', 8, 'Educativo'),
    ]
    const inicial = enriquecerMapaAreasVerdes(tres, dosFichas, tiposCatalogo, coloresOrigen)
    const clases = listarClasificacionesMapa(inicial)

    expect(clases).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'tipo:7', nombre: 'Ornamental', cantidad: 1, color: tiposCatalogo.get(7) }),
      expect.objectContaining({ id: 'tipo:8', nombre: 'Educativo', cantidad: 1, color: tiposCatalogo.get(8) }),
      expect.objectContaining({ id: 'origen:Ornamental', nombre: 'Ornamental', cantidad: 1, color: coloresOrigen.get('Ornamental') }),
    ]))
    expect(clases.find((clase) => clase.id === 'tipo:7')?.id)
      .not.toBe(clases.find((clase) => clase.id === 'origen:Ornamental')?.id)
    const tipoOrnamental = clases.find((clase) => clase.id === 'tipo:7')
    const origenOrnamental = clases.find((clase) => clase.id === 'origen:Ornamental')
    if (!tipoOrnamental || !origenOrnamental) throw new Error('Faltan las dos clasificaciones del caso de prueba.')
    expect(etiquetaClasificacionMapa(tipoOrnamental)).not.toBe(etiquetaClasificacionMapa(origenOrnamental))
    expect(filtrarMapaPorClasificacion(inicial, 'tipo:7').features.map((feature) => feature.properties?.mapa_id))
      .toEqual(['poligono-1'])
    expect(filtrarMapaPorClasificacion(inicial, 'tipo:8').features.map((feature) => feature.properties?.mapa_id))
      .toEqual(['poligono-2'])
    expect(filtrarMapaPorClasificacion(inicial, 'origen:Ornamental').features.map((feature) => feature.properties?.mapa_id))
      .toEqual(['poligono-3'])
    expect(inicial.features[0].properties).toMatchObject({ inventario_nombre: 'Jardín A', inventario_superficie_m2: '125.50' })
    expect(inicial.features[1].properties).toMatchObject({ inventario_nombre: 'Jardín B', inventario_superficie_m2: '80.00' })

    const cambioDeTipo = enriquecerMapaAreasVerdes(tres, [
      ficha('poligono-1', 10, 'Jardín A', '125.50', 8, 'Educativo'),
      dosFichas[1],
    ], tiposCatalogo, coloresOrigen)
    const clasesTrasCambio = listarClasificacionesMapa(cambioDeTipo)
    expect(clasesTrasCambio).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'tipo:8', nombre: 'Educativo', cantidad: 2 }),
      expect.objectContaining({ id: 'origen:Ornamental', cantidad: 1 }),
    ]))
    expect(clasesTrasCambio).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'tipo:7', nombre: 'Ornamental' }),
    ]))
    expect(cambioDeTipo.features[1].properties).toMatchObject({
      clasificacion_mapa_id: inicial.features[1].properties?.clasificacion_mapa_id,
      tipo_uso_color: inicial.features[1].properties?.tipo_uso_color,
    })
    expect(cambioDeTipo.features[2].properties).toMatchObject({
      clasificacion_mapa_id: 'origen:Ornamental',
      tipo_uso_color: coloresOrigen.get('Ornamental'),
    })

    const coloresTrasRecarga = new Map([
      [99, colorEstableClasificacion('tipo:99', paleta)],
      [8, colorEstableClasificacion('tipo:8', paleta)],
      [7, colorEstableClasificacion('tipo:7', paleta)],
    ])
    const recargado = enriquecerMapaAreasVerdes(tres, dosFichas, coloresTrasRecarga, coloresOrigen)
    expect(recargado.features.map((feature) => feature.properties?.tipo_uso_color))
      .toEqual(inicial.features.map((feature) => feature.properties?.tipo_uso_color))
    expect(equivalenciasReferencia[0].tipo_uso_nombre).toBe('Ornamental')
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
