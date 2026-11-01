import { describe, expect, it } from 'vitest'
import type { FilaAtencionEspacio, FilaMovimientoMaterial } from '../../../types/reportesGestion'
import { filtroDeBarra, gruposDesglose, separarUnidad } from './desglose'
import { AGRUPACIONES_ATENCIONES_ESPACIO, AGRUPACIONES_CONSUMO, agruparRegistros, unidadesDe } from './registros'

const e = (etiqueta: string, valor: string) => ({ etiqueta, valor })

describe('gruposDesglose', () => {
  it('separa por prefijo y quita el prefijo del texto', () => {
    const grupos = gruposDesglose('actividades-por-estado', [
      e('Estado: Abierto', '2'),
      e('Estado: Cerrado', '5'),
      e('Tipo: Poda', '3'),
    ])
    expect(grupos.map((g) => g.texto)).toEqual(['Por estado', 'Por tipo de actividad'])
    expect(grupos[0].barras.map((b) => [b.texto, b.valor])).toEqual([
      ['Cerrado', 5],
      ['Abierto', 2],
    ])
  })

  it('agrupa el consumo por unidad', () => {
    const grupos = gruposDesglose('consumo-materiales', [e('Compost (kg)', '16.5'), e('Plantón (unidades)', '30'), e('NPK (kg)', '25')])
    expect(grupos.map((g) => g.texto)).toEqual(['kg', 'unidades'])
    expect(grupos[0].barras.map((b) => b.texto)).toEqual(['NPK', 'Compost'])
  })

  it('ordena el cumplimiento según el flujo de la atención', () => {
    const [grupo] = gruposDesglose('cumplimiento-tercerizados', [e('Reporte adjunto', '1'), e('Requerimiento registrado', '4')])
    expect(grupo.enOrden).toBe(true)
    expect(grupo.barras.map((b) => b.etiqueta)).toEqual(['Requerimiento registrado', 'Reporte adjunto'])
  })

  it('ordena los espacios de mayor a menor', () => {
    const [grupo] = gruposDesglose('atenciones-por-espacio', [e('Patio', '1'), e('Jardín', '3')])
    expect(grupo.barras.map((b) => b.texto)).toEqual(['Jardín', 'Patio'])
  })

  it('separa material y unidad', () => {
    expect(separarUnidad('Abono (bolsa) (kg)')).toEqual({ material: 'Abono (bolsa)', unidad: 'kg' })
    expect(separarUnidad('Abono')).toEqual({ material: 'Abono', unidad: '' })
  })
})

const atencion = (cambios: Partial<FilaAtencionEspacio>): FilaAtencionEspacio => ({
  atencion_id: 1,
  codigo: 'AT-1',
  tipo_servicio: 'Poda',
  estado: 'En ejecución',
  fecha: '2026-10-20',
  area_verde_id: 5,
  espacio: 'Jardín',
  ...cambios,
})

const movimiento = (cambios: Partial<FilaMovimientoMaterial>): FilaMovimientoMaterial => ({
  id: 1,
  actividad_id: 1,
  fecha: '2026-10-20',
  area_verde_id: 5,
  espacio: 'Jardín',
  tipo_material: 'Compost',
  categoria: 'Insumo',
  especie: null,
  cantidad: '2.5',
  unidad: 'kg',
  ...cambios,
})

describe('filtroDeBarra', () => {
  it('encuentra los registros de la barra', () => {
    const sinEspacio = filtroDeBarra('atenciones-por-espacio', 'Sin espacio')
    expect(sinEspacio?.(atencion({ espacio: null, area_verde_id: null }))).toBe(true)
    expect(sinEspacio?.(atencion({}))).toBe(false)
    expect(filtroDeBarra('consumo-materiales', 'Compost (kg)')?.(movimiento({}))).toBe(true)
    expect(filtroDeBarra('actividades-por-estado', 'Estado: Abierto')).toBeNull()
  })
})

describe('agruparRegistros', () => {
  it('cuenta por día en orden de fecha', () => {
    const [porDia] = AGRUPACIONES_ATENCIONES_ESPACIO
    const grupos = agruparRegistros([atencion({ fecha: '2026-10-21' }), atencion({}), atencion({})], porDia)
    expect(grupos.map((g) => [g.clave, g.valor])).toEqual([
      ['2026-10-20', 2],
      ['2026-10-21', 1],
    ])
  })

  it('suma la cantidad del consumo, de mayor a menor', () => {
    const [porMaterial] = AGRUPACIONES_CONSUMO
    const grupos = agruparRegistros(
      [movimiento({}), movimiento({ cantidad: '1.25' }), movimiento({ tipo_material: 'NPK', cantidad: '10' })],
      porMaterial,
    )
    expect(grupos.map((g) => [g.texto, g.valor])).toEqual([
      ['NPK', 10],
      ['Compost', 3.75],
    ])
    expect(unidadesDe([movimiento({ unidad: 'litros' }), movimiento({})])).toEqual(['kg', 'litros'])
  })
})
