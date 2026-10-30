import { describe, expect, it } from 'vitest'
import type { AtencionMapa, ResultadoMapaAtenciones, TipoAtencion } from '../types/reportesGestion'
import {
  aConsultaMapa,
  claveFilaMapa,
  esGeometriaValida,
  limitesDeElementos,
  prepararMapa,
  puntoRepresentativo,
  soloTiposVisibles,
  textoMarcador,
} from './mapaAtenciones'

// Coordenadas claramente ficticias (cerca de 0,0): las pruebas no dependen de la ubicación real del campus.
const PUNTO = { type: 'Point' as const, coordinates: [1, 2] as [number, number] }
const CUADRADO = {
  type: 'Polygon' as const,
  coordinates: [
    [
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
      [0, 0],
    ] as [number, number][],
  ],
}

function atencion(cambios: Partial<AtencionMapa> = {}): AtencionMapa {
  return {
    atencion_id: 1,
    codigo: 'AT-001',
    tipo_atencion: 'Poda',
    tipo_servicio: 'Poda menor',
    fecha: '2026-10-10',
    estado: 'Reporte adjunto',
    modalidad: 'Tercerizado',
    es_riesgo: false,
    proveedor: 'Proveedor de ejemplo',
    area_verde_id: 3,
    espacio: 'Jardín de ejemplo',
    ejemplar_id: null,
    ejemplar_codigo: null,
    archivos_asociados: 0,
    ...cambios,
  }
}

function respuesta(features: { geometry: unknown; properties: AtencionMapa }[], sin: AtencionMapa[]): ResultadoMapaAtenciones {
  return {
    periodo: { desde: '2026-10-01', hasta: '2026-10-31' },
    filtros_aplicados: {
      desde: '2026-10-01',
      hasta: '2026-10-31',
      tipo_atencion: null,
      tipo_uso_id: null,
      area_verde_id: null,
      tipo_servicio_id: null,
      estado: null,
      modalidad: null,
      es_riesgo: null,
    },
    generado_en: '2026-10-28T10:00:00-05:00',
    sin_datos: false,
    mensaje_sin_datos: null,
    indicador: { codigo: 'RF-REP-007', nombre: 'Mapa', descripcion_calculo: '', meta: null, unidad: 'atenciones' },
    totales_por_tipo: [],
    mapa: { type: 'FeatureCollection', features: features.map((f) => ({ type: 'Feature', ...f })) },
    sin_coordenadas: sin,
    notas: [],
  }
}

describe('esGeometriaValida', () => {
  it('acepta un Point y un Polygon válidos', () => {
    expect(esGeometriaValida(PUNTO)).toBe(true)
    expect(esGeometriaValida(CUADRADO)).toBe(true)
  })

  it('rechaza coordenadas fuera de rango, tipos desconocidos y null', () => {
    expect(esGeometriaValida({ type: 'Point', coordinates: [200, 0] })).toBe(false)
    expect(esGeometriaValida({ type: 'LineString', coordinates: [[0, 0], [1, 1]] })).toBe(false)
    expect(esGeometriaValida(null)).toBe(false)
  })
})

describe('prepararMapa', () => {
  it('sin features, todo va a la lista sin ubicación (caso actual de main)', () => {
    const { elementos, filas } = prepararMapa(respuesta([], [atencion(), atencion({ atencion_id: 2 })]))
    expect(elementos).toEqual([])
    expect(filas.map((f) => [f.atencion_id, f.con_ubicacion])).toEqual([
      [1, false],
      [2, false],
    ])
  })

  it('dibuja las geometrías válidas, deja las demás en la lista y conserva el orden', () => {
    const { elementos, filas } = prepararMapa(
      respuesta(
        [
          { geometry: PUNTO, properties: atencion({ atencion_id: 1 }) },
          { geometry: { type: 'Point', coordinates: ['x', 0] }, properties: atencion({ atencion_id: 2 }) },
        ],
        [atencion({ atencion_id: 3 })],
      ),
    )
    expect(elementos.map((e) => e.properties.atencion_id)).toEqual([1])
    expect(filas.map((f) => [f.atencion_id, f.con_ubicacion])).toEqual([
      [1, true],
      [2, false],
      [3, false],
    ])
  })
})

describe('claveFilaMapa', () => {
  it('distingue la misma atención en espacios o ejemplares distintos', () => {
    expect(claveFilaMapa(atencion())).toBe('1-3-sin')
    expect(claveFilaMapa(atencion({ area_verde_id: null, ejemplar_id: 9 }))).toBe('1-sin-9')
  })
})

describe('limitesDeElementos', () => {
  it('devuelve null sin elementos', () => {
    expect(limitesDeElementos([])).toBeNull()
  })

  it('combina puntos y polígonos', () => {
    expect(limitesDeElementos([{ geometry: { type: 'Point', coordinates: [-1, 5] } }, { geometry: CUADRADO }])).toEqual([
      [-1, 0],
      [4, 5],
    ])
  })
})

describe('puntoRepresentativo', () => {
  it('usa el Point tal cual y el centro de la caja de un polígono', () => {
    expect(puntoRepresentativo(PUNTO)).toEqual([1, 2])
    expect(puntoRepresentativo(CUADRADO)).toEqual([2, 2])
  })
})

describe('soloTiposVisibles', () => {
  it('filtra por los tipos marcados', () => {
    const lista = [atencion({ tipo_atencion: 'Poda' }), atencion({ tipo_atencion: 'Mantenimiento' })]
    const visibles = new Set<TipoAtencion>(['Mantenimiento'])
    expect(soloTiposVisibles(lista, visibles).map((a) => a.tipo_atencion)).toEqual(['Mantenimiento'])
  })
})

describe('textoMarcador', () => {
  it('incluye código, tipo, fecha y espacio', () => {
    expect(textoMarcador(atencion())).toBe('Atención AT-001, Poda, 10 oct. 2026, Jardín de ejemplo')
    expect(textoMarcador(atencion({ area_verde_id: null, espacio: 'Sin espacio' }))).toBe(
      'Atención AT-001, Poda, 10 oct. 2026, Sin espacio',
    )
  })
})

describe('aConsultaMapa', () => {
  const VACIOS = {
    desde: '2026-10-01',
    hasta: '2026-10-31',
    tipo_atencion: '',
    area_verde_id: '',
    tipo_servicio_id: '',
    estado: '',
    modalidad: '',
    es_riesgo: '',
  }

  it('omite los vacíos', () => {
    expect(aConsultaMapa(VACIOS)).toEqual({ desde: '2026-10-01', hasta: '2026-10-31' })
  })

  it('convierte es_riesgo y valida el tipo de atención', () => {
    expect(aConsultaMapa({ ...VACIOS, es_riesgo: 'true', tipo_atencion: 'Poda' })).toEqual({
      desde: '2026-10-01',
      hasta: '2026-10-31',
      es_riesgo: true,
      tipo_atencion: 'Poda',
    })
    expect(aConsultaMapa({ ...VACIOS, es_riesgo: 'false', tipo_atencion: 'Otro' })).toEqual({
      desde: '2026-10-01',
      hasta: '2026-10-31',
      es_riesgo: false,
    })
  })
})
