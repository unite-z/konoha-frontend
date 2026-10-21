import { describe, expect, it } from 'vitest'
import type { Contrato } from '../types/tercerizados'
import {
  BORRADOR_VACIO,
  alternarAlcance,
  construirEntrada,
  hayCambiosBorrador,
  hayErroresPaso2,
  normalizarMetrado,
  pasoDeCampo,
  validarPaso1,
  validarPaso2,
  type AlcanceSeleccionado,
  type BorradorAtencion,
} from './nuevaAtencion'

const HOY = '2026-10-21'
const contrato: Contrato = {
  id: 1,
  numero: 'CT-2026-001',
  proveedor_id: 1,
  proveedor_nombre: 'Terraverde',
  tipo_servicio_id: 1,
  tipo_servicio_nombre: 'Corte',
  vigencia_inicio: '2026-01-01',
  vigencia_fin: '2026-12-31',
}
const area = { tipo: 'area' as const, id: 3, etiqueta: 'Jardín A' }
const ejemplar = { tipo: 'ejemplar' as const, id: 9, etiqueta: 'E-09', detalle: 'Jardín A' }

function borrador(cambios: Partial<BorradorAtencion> = {}): BorradorAtencion {
  return { ...BORRADOR_VACIO, contrato, descripcion: 'Corte', origen: 'Demanda', ...cambios }
}

function seleccion(...extra: Partial<AlcanceSeleccionado>[]): AlcanceSeleccionado[] {
  let lista = alternarAlcance([], area)
  lista = alternarAlcance(lista, ejemplar)
  return lista.map((a, i) => ({ ...a, ...(extra[i] ?? {}) }))
}

describe('alternarAlcance', () => {
  it('agrega y quita por tipo e id sin duplicar', () => {
    let lista = alternarAlcance([], area)
    lista = alternarAlcance(lista, ejemplar)
    expect(lista.map((a) => a.clave)).toEqual(['area:3', 'ejemplar:9'])
    // Un área y un ejemplar con el mismo id son destinos distintos.
    lista = alternarAlcance(lista, { tipo: 'ejemplar', id: 3, etiqueta: 'E-03' })
    expect(lista).toHaveLength(3)
    lista = alternarAlcance(lista, area)
    expect(lista.map((a) => a.clave)).toEqual(['ejemplar:9', 'ejemplar:3'])
  })
})

describe('normalizarMetrado', () => {
  it.each([
    ['120', '120.00'],
    ['120.5', '120.50'],
    ['1 250,75', '1250.75'],
    ['0', '0.00'],
    [' 3,1 ', '3.10'],
  ])('%s → %s', (texto, esperado) => {
    expect(normalizarMetrado(texto)).toBe(esperado)
  })

  it.each(['-1', '1.234', 'abc', '1e3', '', '12345678901'])('rechaza %j', (texto) => {
    expect(normalizarMetrado(texto)).toBeNull()
  })
})

describe('validarPaso1', () => {
  it('borrador completo sin errores', () => {
    expect(validarPaso1(borrador(), HOY)).toEqual({})
  })

  it('exige contrato vigente, descripción y origen', () => {
    expect(validarPaso1(BORRADOR_VACIO, HOY)).toEqual({
      contrato: expect.stringMatching(/contrato/),
      descripcion: expect.any(String),
      origen: expect.any(String),
    })
    expect(validarPaso1(borrador({ contrato: { ...contrato, vigencia_fin: '2026-10-20' } }), HOY).contrato).toMatch(/vigente/)
    expect(validarPaso1(borrador({ contrato: { ...contrato, vigencia_inicio: '2026-10-21' } }), HOY)).toEqual({})
  })

  it('la solicitud de una unidad exige la unidad o un nombre provisional', () => {
    expect(validarPaso1(borrador({ origen: 'SolicitudUnidad' }), HOY).unidad).toBeDefined()
    const provisional = borrador({ origen: 'SolicitudUnidad', unidadModo: 'provisional' })
    expect(validarPaso1(provisional, HOY).unidadProvisional).toBeDefined()
    expect(validarPaso1({ ...provisional, unidadProvisional: 'x'.repeat(151) }, HOY).unidadProvisional).toMatch(/150/)
    expect(validarPaso1({ ...provisional, unidadProvisional: 'Facultad de Letras' }, HOY)).toEqual({})
  })
})

describe('validarPaso2', () => {
  it('exige al menos un alcance', () => {
    expect(validarPaso2([]).general).toBeDefined()
  })

  it('metrado y unidad van juntos o no van', () => {
    expect(hayErroresPaso2(validarPaso2(seleccion()))).toBe(false)
    expect(validarPaso2(seleccion({ metrado: '120' })).porAlcance['area:3'].unidad).toBeDefined()
    expect(validarPaso2(seleccion({ unidad_medida_id: '2' })).porAlcance['area:3'].metrado).toBeDefined()
    expect(validarPaso2(seleccion({ metrado: '-5', unidad_medida_id: '2' })).porAlcance['area:3'].metrado).toMatch(/mayor o igual/)
    expect(hayErroresPaso2(validarPaso2(seleccion({ metrado: '120,5', unidad_medida_id: '2' })))).toBe(false)
  })
})

describe('construirEntrada', () => {
  it('envía solo los campos admitidos', () => {
    const entrada = construirEntrada(borrador({ descripcion: '  Corte  ', alcances: seleccion({ metrado: '1 250,5', unidad_medida_id: '2' }) }))
    expect(entrada).toEqual({
      contrato_id: 1,
      descripcion: 'Corte',
      origen: 'Demanda',
      alcances: [{ area_verde_id: 3, metrado: '1250.50', unidad_medida_id: 2 }, { ejemplar_id: 9 }],
    })
  })

  it('incluye riesgo y unidad según el caso', () => {
    const existente = { id: 4, nombre: 'Biblioteca', provisional: false, activo: true }
    expect(construirEntrada(borrador({ origen: 'SolicitudUnidad', unidad: existente, es_riesgo: true, alcances: seleccion() })))
      .toMatchObject({ unidad_solicitante_id: 4, es_riesgo: true })
    const provisional = construirEntrada(
      borrador({ origen: 'SolicitudUnidad', unidadModo: 'provisional', unidad: existente, unidadProvisional: ' Letras ', alcances: seleccion() }),
    )
    expect(provisional.unidad_provisional).toBe('Letras')
    expect(provisional.unidad_solicitante_id).toBeUndefined()
    // Otros orígenes no envían unidad aunque haya quedado elegida.
    expect(construirEntrada(borrador({ unidad: existente, alcances: seleccion() })).unidad_solicitante_id).toBeUndefined()
  })
})

describe('utilidades', () => {
  it('detecta cambios en el borrador', () => {
    expect(hayCambiosBorrador(BORRADOR_VACIO)).toBe(false)
    expect(hayCambiosBorrador({ ...BORRADOR_VACIO, descripcion: ' x' })).toBe(true)
  })

  it('ubica el paso de un campo rechazado', () => {
    expect(pasoDeCampo('alcances[0].metrado')).toBe(2)
    expect(pasoDeCampo('contrato_id')).toBe(1)
  })
})
