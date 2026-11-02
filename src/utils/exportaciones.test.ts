import { describe, expect, it } from 'vitest'
import type { ReporteGenerado, TipoExportable } from '../types/exportaciones'
import { ErrorApi } from '../services/api/cliente'
import {
  clasificarErrorExportacion,
  formatoAlternativo,
  formatosPermitidos,
  nombreArchivoSimulado,
  parametrosParaTipo,
  resumenExportacion,
  superaLimite,
  validarExportacion,
  type FiltrosExportacion,
} from './exportaciones'

function tipo(cambios: Partial<TipoExportable>): TipoExportable {
  return {
    tipo: 'GestionOSG',
    nombre: 'Reporte general de gestión',
    descripcion: '',
    formatos: ['PDF', 'Excel'],
    filtros: ['mes'],
    disponible: true,
    motivo_no_disponible: null,
    limite_filas: { PDF: 5000 },
    ...cambios,
  }
}

const VACIOS: FiltrosExportacion = {
  desde: '',
  hasta: '',
  mes: '',
  tipo_servicio_id: '',
  proveedor_id: '',
  area_verde_id: '',
  modalidad: '',
}

const CATALOGOS = {
  servicios: new Map([[2, 'Control fitosanitario']]),
  proveedores: new Map([[101, 'Verde Campus (demo)']]),
  espacios: new Map<number, string>(),
}

describe('parametrosParaTipo', () => {
  it('envía solo los filtros que admite el tipo, sin vacíos', () => {
    const servicio = tipo({ tipo: 'ServicioTercerizado', filtros: ['periodo', 'tipo_servicio_id', 'proveedor_id'] })
    const filtros = { ...VACIOS, desde: '2026-10-01', hasta: '2026-10-31', mes: '2026-10', tipo_servicio_id: '2', area_verde_id: '7' }
    expect(parametrosParaTipo(servicio, filtros)).toEqual({ desde: '2026-10-01', hasta: '2026-10-31', tipo_servicio_id: 2 })
  })

  it('descarta ids no válidos', () => {
    const material = tipo({ filtros: ['mes', 'area_verde_id'] })
    expect(parametrosParaTipo(material, { ...VACIOS, mes: '2026-10', area_verde_id: 'abc' })).toEqual({ mes: '2026-10' })
  })
})

describe('validarExportacion', () => {
  it('exige el mes o el periodo según el tipo', () => {
    expect(validarExportacion(tipo({}), VACIOS).mes).toBeDefined()
    expect(validarExportacion(tipo({}), { ...VACIOS, mes: '2026-10' })).toEqual({})
    const errores = validarExportacion(tipo({ filtros: ['periodo'] }), { ...VACIOS, desde: '2026-10-31', hasta: '2026-10-01' })
    expect(errores.hasta).toBe('La fecha de fin debe ser igual o posterior a la fecha de inicio')
  })
})

describe('resumenExportacion', () => {
  it('conserva el tipo, el periodo, los filtros y el formato (criterio 2)', () => {
    const servicio = tipo({ nombre: 'Servicio tercerizado' })
    expect(resumenExportacion(servicio, { mes: '2026-10', tipo_servicio_id: 2, proveedor_id: 9 }, CATALOGOS, 'Excel')).toBe(
      'Servicio tercerizado · oct. 2026 · Servicio: Control fitosanitario · Proveedor: n.º 9 · Excel (.xlsx)',
    )
    expect(resumenExportacion(servicio, { desde: '2026-10-01', hasta: '2026-10-15', modalidad: 'Tercerizado' }, CATALOGOS)).toBe(
      'Servicio tercerizado · Del 01 oct. 2026 al 15 oct. 2026 · Modalidad: Tercerizado',
    )
  })
})

describe('formatos y límites', () => {
  it('un tipo no disponible no ofrece formatos', () => {
    expect(formatosPermitidos(tipo({}))).toEqual(['PDF', 'Excel'])
    expect(formatosPermitidos(tipo({ disponible: false }))).toEqual([])
  })

  it('superaLimite solo con filas conocidas por encima del límite del formato', () => {
    const osg = tipo({})
    expect(superaLimite(osg, 'PDF', 7250)).toBe(true)
    expect(superaLimite(osg, 'PDF', 5000)).toBe(false)
    expect(superaLimite(osg, 'Excel', 7250)).toBe(false)
    expect(superaLimite(osg, 'PDF')).toBe(false)
  })

  it('formatoAlternativo propone el otro formato permitido', () => {
    expect(formatoAlternativo(tipo({}), 'PDF')).toBe('Excel')
    expect(formatoAlternativo(tipo({ formatos: ['PDF'] }), 'PDF')).toBeNull()
  })
})

describe('nombreArchivoSimulado', () => {
  const reporte = { tipo: 'MaterialVegetal', parametros: { mes: '2026-10' } } as Pick<ReporteGenerado, 'tipo' | 'parametros'>

  it('usa el tipo y el periodo', () => {
    expect(nombreArchivoSimulado({ ...(reporte as ReporteGenerado) })).toBe('MaterialVegetal-2026-10-simulado.csv')
    expect(
      nombreArchivoSimulado({ ...(reporte as ReporteGenerado), parametros: { desde: '2026-10-01', hasta: '2026-10-31' } }),
    ).toBe('MaterialVegetal-2026-10-01_2026-10-31-simulado.csv')
  })
})

describe('clasificarErrorExportacion', () => {
  it('distingue A1, A2, los errores por campo y el resto', () => {
    expect(clasificarErrorExportacion(new ErrorApi(422, 'volumen-excedido', 'x'))).toBe('volumen')
    expect(clasificarErrorExportacion(new ErrorApi(422, 'sin-datos', 'x'))).toBe('sin-datos')
    expect(clasificarErrorExportacion(new ErrorApi(400, 'parametro-invalido', 'x', { mes: ['Indica el mes'] }))).toBe('campos')
    expect(clasificarErrorExportacion(new ErrorApi(400, 'parametro-invalido', 'x'))).toBe('general')
    expect(clasificarErrorExportacion(new ErrorApi(403, 'sin-permiso', 'x'))).toBe('general')
    expect(clasificarErrorExportacion(new ErrorApi(503, null, 'x'))).toBe('general')
  })
})
