import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ComparacionMes, ResultadoIndicador } from '../types/reportesGestion'
import {
  aConsultaGestion,
  MENSAJES_MES,
  esClaveIndicador,
  filasComparacion,
  mesActualLima,
  mesesSinDatos,
  validarMes,
  insigniaEstadoAtencion,
  notasUnicas,
  numeroDeDecimal,
  rutaDetalleConFiltros,
  valorTarjeta,
} from './reportesGestion'

const VACIOS = { desde: '2026-10-01', hasta: '2026-10-31', area_verde_id: '', tipo_servicio_id: '', estado: '', modalidad: '' }

function indicador(cambios: Partial<ResultadoIndicador>): ResultadoIndicador {
  return {
    clave: 'cumplimiento-tercerizados',
    indicador: { codigo: 'RF-REP-008', nombre: 'Cumplimiento', descripcion_calculo: '', meta: null, unidad: '%' },
    valor: null,
    sin_datos: false,
    mensaje_sin_datos: null,
    desglose: [],
    notas: [],
    ...cambios,
  }
}

describe('numeroDeDecimal', () => {
  it.each([
    ['12.50', 12.5],
    ['0.30', 0.3],
    [5, 5],
    [null, null],
    ['', null],
    ['abc', null],
  ])('%j → %j', (entrada, esperado) => {
    expect(numeroDeDecimal(entrada)).toBe(esperado)
  })
})

describe('valorTarjeta', () => {
  it('devuelve null sin datos', () => {
    expect(valorTarjeta(indicador({ sin_datos: true, mensaje_sin_datos: 'Sin partes diarios' }))).toBeNull()
  })

  it('formatea enteros y decimales con coma', () => {
    expect(valorTarjeta(indicador({ valor: '5' }))).toBe('5')
    expect(valorTarjeta(indicador({ valor: '66.67' }))).toBe('66,67')
  })
})

describe('aConsultaGestion', () => {
  it('omite los filtros vacíos', () => {
    expect(aConsultaGestion(VACIOS)).toEqual({ desde: '2026-10-01', hasta: '2026-10-31' })
  })

  it('convierte los ids y deja pasar estado y modalidad tal cual', () => {
    expect(
      aConsultaGestion({ ...VACIOS, area_verde_id: '7', tipo_servicio_id: 'x', estado: 'Observado', modalidad: 'Tercerizado' }),
    ).toEqual({ desde: '2026-10-01', hasta: '2026-10-31', area_verde_id: 7, estado: 'Observado', modalidad: 'Tercerizado' })
  })
})

describe('notasUnicas', () => {
  it('une sin duplicados y conserva el orden de aparición', () => {
    expect(notasUnicas(['b', 'a'], ['a', 'c'], [], ['b'])).toEqual(['b', 'a', 'c'])
  })
})

describe('rutaDetalleConFiltros', () => {
  it('conserva los filtros y quita la página', () => {
    expect(rutaDetalleConFiltros('/reportes-indicadores/panel/atenciones-por-espacio', '?desde=2026-10-01&page=3')).toBe(
      '/reportes-indicadores/panel/atenciones-por-espacio?desde=2026-10-01',
    )
  })

  it('sin filtros devuelve la ruta sola', () => {
    expect(rutaDetalleConFiltros('/reportes-indicadores/panel/x', '')).toBe('/reportes-indicadores/panel/x')
  })
})

describe('esClaveIndicador', () => {
  it('reconoce solo las cinco claves', () => {
    expect(esClaveIndicador('consumo-materiales')).toBe(true)
    expect(esClaveIndicador('otro')).toBe(false)
    expect(esClaveIndicador(undefined)).toBe(false)
  })
})

describe('insigniaEstadoAtencion', () => {
  it.each([
    ['En ejecución', 'info'],
    ['Reporte adjunto', 'exito'],
    ['Observado', 'advertencia'],
    ['Conforme / cerrado', 'exito'],
    ['Otro', 'neutral'],
  ])('%s → %s', (estado, tono) => {
    expect(insigniaEstadoAtencion(estado)).toEqual({ texto: estado, tono })
  })
})

describe('validarMes', () => {
  it('acepta AAAA-MM', () => {
    expect(validarMes('2026-10')).toBeUndefined()
  })

  it('pide el mes si falta', () => {
    expect(validarMes('')).toBe(MENSAJES_MES.falta)
  })

  it.each(['2026-13', '2026-1', 'octubre'])('rechaza el formato de %j', (mes) => {
    expect(validarMes(mes)).toBe(MENSAJES_MES.formato)
  })
})

describe('mesActualLima', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('usa la fecha de Lima, no la UTC', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-01T03:00:00Z'))
    expect(mesActualLima()).toBe('2026-10')
  })
})

const COMPARACION: ComparacionMes[] = [
  {
    mes: '2026-07',
    sin_datos: false,
    consumido: [{ tipo_material: 'Abono', unidad: 'kg', cantidad: '12.50' }],
    propagado: [{ tipo_material: 'Esquejes', unidad: 'unidad', cantidad: '30.00' }],
    trasladado: [{ tipo_material: 'Plantas', unidad: 'unidad', cantidad: '4.00' }],
  },
  { mes: '2026-08', sin_datos: true, consumido: [], propagado: [], trasladado: [] },
  {
    mes: '2026-09',
    sin_datos: false,
    consumido: [],
    propagado: [{ tipo_material: 'Esquejes', unidad: 'unidad', cantidad: '10.00' }],
    trasladado: [],
  },
]

describe('filasComparacion', () => {
  it('ordena por mes y, dentro del mes, consumido, propagado y trasladado', () => {
    expect(filasComparacion(COMPARACION).map((f) => `${f.mes} ${f.movimiento} ${f.tipo_material}`)).toEqual([
      '2026-07 Consumido Abono',
      '2026-07 Propagado Esquejes',
      '2026-07 Trasladado Plantas',
      '2026-09 Propagado Esquejes',
    ])
  })
})

describe('mesesSinDatos', () => {
  it('devuelve solo los meses sin movimientos', () => {
    expect(mesesSinDatos(COMPARACION)).toEqual(['2026-08'])
  })
})
