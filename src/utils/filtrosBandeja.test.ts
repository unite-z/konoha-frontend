import { describe, expect, it } from 'vitest'
import { formatearTamanoArchivo } from './formato'
import { FILTROS_BANDEJA_VACIOS, hayFiltros, leerFiltrosBandeja } from './filtrosBandeja'

function leer(cambios: Partial<typeof FILTROS_BANDEJA_VACIOS>) {
  return leerFiltrosBandeja({ ...FILTROS_BANDEJA_VACIOS, ...cambios })
}

describe('leerFiltrosBandeja', () => {
  it('sin parámetros no filtra y está en la página 1', () => {
    expect(leer({})).toEqual({ filtros: {}, pagina: 1 })
  })

  it('acepta valores válidos', () => {
    expect(leer({ q: '  poda  ', estado: 'En ejecución', origen: 'SolicitudUnidad', contrato_id: '12', pagina: '3' }))
      .toEqual({ filtros: { q: 'poda', estado: 'En ejecución', origen: 'SolicitudUnidad', contrato_id: 12 }, pagina: 3 })
  })

  it('ignora valores no válidos', () => {
    expect(leer({ estado: 'Conforme', origen: 'demanda', contrato_id: '0', pagina: '-2' })).toEqual({ filtros: {}, pagina: 1 })
    expect(leer({ contrato_id: '3.5', pagina: 'abc' })).toEqual({ filtros: {}, pagina: 1 })
    expect(leer({ contrato_id: '99999999999999' }).filtros).toEqual({})
  })

  it('recorta la búsqueda al largo que admite la API', () => {
    expect(leer({ q: 'x'.repeat(150) }).filtros.q).toHaveLength(100)
    expect(leer({ q: '   ' }).filtros).toEqual({})
  })
})

describe('hayFiltros', () => {
  it('detecta cualquier filtro', () => {
    expect(hayFiltros({})).toBe(false)
    expect(hayFiltros({ q: 'x' })).toBe(true)
    expect(hayFiltros({ contrato_id: 1 })).toBe(true)
  })
})

describe('formatearTamanoArchivo', () => {
  it.each([
    [0, '0 B'],
    [820, '820 B'],
    [1024, '1 KB'],
    [12_700, '12,4 KB'],
    [3_250_000, '3,1 MB'],
    [20 * 1024 * 1024, '20 MB'],
  ])('%d bytes → %s', (bytes, texto) => {
    expect(formatearTamanoArchivo(bytes)).toBe(texto)
  })

  it('sin valor', () => {
    expect(formatearTamanoArchivo(null)).toBe('—')
    expect(formatearTamanoArchivo(-1)).toBe('—')
  })
})

describe('presentación de atenciones', async () => {
  const { codigoCorto, fechasPorEstado, resumenAlcances, textoAlcance } = await import('./estadosTercerizados')
  const alcance = { area_verde_id: null, area_verde_nombre: null, ejemplar_id: 3, ejemplar_codigo: 'E-01', ejemplar_area_verde_nombre: null }

  it('abrevia el código', () => {
    expect(codigoCorto('AT-1922f2a6e4814692986f1a98d69bd286')).toBe('AT-1922f2a6')
    expect(codigoCorto('AT-1')).toBe('AT-1')
  })

  it('describe alcances', () => {
    expect(textoAlcance({ ...alcance, ejemplar_area_verde_nombre: 'Jardín A' })).toBe('E-01 · Jardín A')
    expect(textoAlcance({ ...alcance, area_verde_id: 2, area_verde_nombre: 'Bosque', ejemplar_id: null })).toBe('Bosque')
    expect(resumenAlcances([{ area_verde_id: 1 }, { area_verde_id: null }, { area_verde_id: null }])).toBe('1 área verde · 2 ejemplares')
    expect(resumenAlcances([])).toBe('Sin alcances')
  })

  it('usa la última entrada de cada estado', () => {
    const fechas = fechasPorEstado([
      { estado_anterior: '', estado_nuevo: 'Requerimiento registrado', usuario_id: 1, usuario_nombre: 'a', fecha_hora: 't1' },
      { estado_anterior: 'Requerimiento registrado', estado_nuevo: 'OC referenciada', usuario_id: 1, usuario_nombre: 'a', fecha_hora: 't2' },
      { estado_anterior: 'OC referenciada', estado_nuevo: 'OC referenciada', usuario_id: 1, usuario_nombre: 'a', fecha_hora: 't3' },
    ])
    expect(fechas).toEqual({ 'Requerimiento registrado': 't1', 'OC referenciada': 't3' })
  })
})
