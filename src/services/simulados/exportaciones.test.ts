import { afterEach, describe, expect, it, vi } from 'vitest'
import { csvSimulado, generarSimulado, simularListarExportaciones } from './exportaciones'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('generarSimulado (RF-REP-009)', () => {
  it('crea un reporte con filas deterministas y lo añade al historial', async () => {
    const solicitud = { tipo: 'GestionOSG', formato: 'PDF', parametros: { mes: '2026-10' } } as const
    const primero = generarSimulado(solicitud, new Date('2026-10-31T15:00:00Z'))
    const segundo = generarSimulado(solicitud, new Date('2026-10-31T15:05:00Z'))
    expect(primero.filas).toBe(segundo.filas)
    expect(segundo.id).toBe(primero.id + 1)
    expect(primero.archivo?.nombre).toMatch(/\.pdf$/)
    const historial = await simularListarExportaciones({ tipo: 'GestionOSG' })
    expect(historial.results[0].id).toBe(segundo.id)
  })

  it('valida el periodo y el formato', () => {
    expect(() => generarSimulado({ tipo: 'GestionOSG', formato: 'PDF', parametros: {} })).toThrow('Indica el mes')
    expect(() => generarSimulado({ tipo: 'DistribucionPersonal', formato: 'PDF', parametros: {} })).toThrow(
      'ese formato',
    )
    expect(() => generarSimulado({ tipo: 'MatrizIncidencias', formato: 'PDF', parametros: {} })).toThrow(
      'Indica el periodo',
    )
  })

  it('la matriz de incidencias se exporta con su periodo', () => {
    const reporte = generarSimulado({
      tipo: 'MatrizIncidencias',
      formato: 'Excel',
      parametros: { desde: '2026-10-01', hasta: '2026-10-31' },
    })
    expect(reporte.tipo).toBe('MatrizIncidencias')
  })

  it('?simular=volumen-excedido solo afecta al PDF; ?simular=vacio no genera', () => {
    vi.stubGlobal('location', { search: '?simular=volumen-excedido' })
    expect(() => generarSimulado({ tipo: 'GestionOSG', formato: 'PDF', parametros: { mes: '2026-10' } })).toThrow(
      '7 250 filas',
    )
    expect(generarSimulado({ tipo: 'GestionOSG', formato: 'Excel', parametros: { mes: '2026-10' } }).formato).toBe(
      'Excel',
    )
    vi.stubGlobal('location', { search: '?simular=vacio' })
    expect(() => generarSimulado({ tipo: 'GestionOSG', formato: 'Excel', parametros: { mes: '2026-10' } })).toThrow(
      'No hay datos para exportar',
    )
  })
})

describe('csvSimulado', () => {
  it('lleva la cabecera de metadatos y la marca de datos simulados', () => {
    const reporte = generarSimulado({ tipo: 'MaterialVegetal', formato: 'Excel', parametros: { mes: '2026-09' } })
    const csv = csvSimulado(reporte)
    expect(csv.split('\r\n')[0]).toContain('DATOS SIMULADOS')
    expect(csv).toContain('"Periodo y filtros";"sept. 2026"')
    expect(csv).toContain('"Generado por"')
  })
})
