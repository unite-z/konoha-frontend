import { describe, expect, it } from 'vitest'
import { agruparRegistros } from '../../../../components/reportes-indicadores/graficos/agrupar'
import type { ResultadoMaterialVegetal, TotalMaterial, TotalTraslado } from '../../../../types/reportesGestion'
import {
  AGRUPACIONES_MATERIAL,
  AGRUPACIONES_TRASLADO,
  materialesComparacion,
  mesesComparacion,
  serieComparacion,
  totalesDelMes,
  unidadesComparacion,
} from './materialVegetal'

const material = (cambios: Partial<TotalMaterial>): TotalMaterial => ({
  area_verde_id: 1,
  espacio: 'Jardín',
  tipo_material: 'Compost',
  categoria: 'Insumo',
  unidad: 'kg',
  cantidad: '2.5',
  movimientos: 1,
  ...cambios,
})

const traslado = (cambios: Partial<TotalTraslado>): TotalTraslado => ({
  origen_area_id: 1,
  origen: 'Vivero',
  destino_area_id: 2,
  destino: 'Jardín',
  tipo_material: 'Plantón',
  categoria: 'Material vegetal',
  unidad: 'unidades',
  cantidad: '10',
  movimientos: 1,
  ...cambios,
})

describe('agrupaciones del mes', () => {
  it('suma la cantidad por material', () => {
    const grupos = agruparRegistros(
      [material({}), material({ espacio: 'Patio', cantidad: '1.5' }), material({ tipo_material: 'NPK', cantidad: '1' })],
      AGRUPACIONES_MATERIAL[0],
    )
    expect(grupos.map((g) => [g.texto, g.valor])).toEqual([
      ['Compost', 4],
      ['NPK', 1],
    ])
  })

  it('agrupa los traslados por ruta', () => {
    const grupos = agruparRegistros([traslado({}), traslado({ cantidad: '5' })], AGRUPACIONES_TRASLADO[0])
    expect(grupos.map((g) => [g.texto, g.valor])).toEqual([['Vivero → Jardín', 15]])
  })

  it('totaliza el mes por material y unidad', () => {
    expect(totalesDelMes([material({}), material({ espacio: 'Patio' }), material({ unidad: 'bolsas', cantidad: '3' })])).toEqual([
      { tipo_material: 'Compost', unidad: 'kg', cantidad: '5' },
      { tipo_material: 'Compost', unidad: 'bolsas', cantidad: '3' },
    ])
  })
})

describe('comparación', () => {
  const datos = {
    sin_datos: false,
    filtros_aplicados: { mes: '2026-10', area_verde_id: null },
    consumido: [material({}), material({ tipo_material: 'NPK', cantidad: '4' })],
    propagado: [],
    trasladado: [],
    comparacion: [
      { mes: '2026-09', sin_datos: false, consumido: [{ tipo_material: 'Compost', unidad: 'kg', cantidad: '1' }], propagado: [], trasladado: [] },
      { mes: '2026-08', sin_datos: true, consumido: [], propagado: [], trasladado: [] },
    ],
  } as unknown as ResultadoMaterialVegetal

  it('ordena los meses y añade el mes elegido', () => {
    expect(mesesComparacion(datos).map((m) => m.mes)).toEqual(['2026-08', '2026-09', '2026-10'])
  })

  it('suma cada mes y deja sin valor los meses sin movimientos', () => {
    const meses = mesesComparacion(datos)
    expect(serieComparacion(meses, 'consumido', 'kg', null).map((p) => p.valor)).toEqual([null, 1, 6.5])
    expect(serieComparacion(meses, 'consumido', 'kg', 'NPK').map((p) => p.valor)).toEqual([null, null, 4])
  })

  it('lista unidades y materiales del movimiento', () => {
    const meses = mesesComparacion(datos)
    expect(unidadesComparacion(meses, 'consumido')).toEqual(['kg'])
    expect(materialesComparacion(meses, 'consumido', 'kg')).toEqual(['Compost', 'NPK'])
    expect(unidadesComparacion(meses, 'trasladado')).toEqual([])
  })
})
