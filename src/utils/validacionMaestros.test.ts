import { describe, expect, it } from 'vitest'
import type { ProveedorMaestro } from '../types/maestrosTercerizados'
import {
  BORRADOR_CONTRATO_VACIO,
  BORRADOR_ESPECIAL_VACIO,
  BORRADOR_PROVEEDOR_VACIO,
  construirContrato,
  construirEspecial,
  construirProveedor,
  hayErrores,
  normalizarMonto,
  textoAplicaciones,
  textoVinculo,
  validarContrato,
  validarEspecial,
  validarProveedor,
  type BorradorContrato,
} from './validacionMaestros'

const PRINCIPAL: ProveedorMaestro = {
  id: 7,
  razon_social: 'Servicios Verdes Demo S.A.C.',
  ruc: '20000000001',
  activo: true,
  contacto: '',
  tipo_vinculo: 'Principal',
  proveedor_relacionado_id: null,
  proveedor_relacionado_nombre: null,
  contratos: 0,
}

const CONTRATO_VALIDO: BorradorContrato = {
  proveedor: PRINCIPAL,
  tipoServicioId: '3',
  area: '120 ejemplares',
  monto: '12 000,00',
  frecuencia: '4 al año',
  inicio: '2026-01-01',
  fin: '2026-12-31',
  condiciones: '  Pago a 30 días ',
}

describe('validarProveedor', () => {
  it('pide razón social y RUC', () => {
    const errores = validarProveedor(BORRADOR_PROVEEDOR_VACIO)
    expect(errores.razonSocial).toBeDefined()
    expect(errores.ruc).toBeDefined()
    expect(errores.relacionado).toBeUndefined()
  })

  it.each(['2000', '2000000000A', '20000000001 ', '20-0000000-01', '200000000012'])('rechaza el RUC %j', (ruc) => {
    // El espacio final se recorta: solo falla si queda algo que no son 11 dígitos.
    const errores = validarProveedor({ ...BORRADOR_PROVEEDOR_VACIO, razonSocial: 'X', ruc })
    expect(Boolean(errores.ruc)).toBe(ruc.trim() !== '20000000001')
  })

  it('exige el proveedor relacionado solo para subsidiaria y vinculada', () => {
    const base = { ...BORRADOR_PROVEEDOR_VACIO, razonSocial: 'X', ruc: '20000000002' }
    expect(validarProveedor({ ...base, tipoVinculo: 'Subsidiaria' }).relacionado).toBeDefined()
    expect(validarProveedor({ ...base, tipoVinculo: 'Vinculada' }).relacionado).toBeDefined()
    expect(hayErrores(validarProveedor({ ...base, tipoVinculo: 'Principal' }))).toBe(false)
    expect(hayErrores(validarProveedor({ ...base, tipoVinculo: 'Subsidiaria', relacionado: PRINCIPAL }))).toBe(false)
  })
})

describe('construirProveedor', () => {
  it('omite el contacto vacío y el relacionado que no corresponde', () => {
    const entrada = construirProveedor({
      ...BORRADOR_PROVEEDOR_VACIO,
      razonSocial: ' Podas Altura ',
      ruc: '20000000003',
      relacionado: PRINCIPAL,
    })
    expect(entrada).toEqual({ razon_social: 'Podas Altura', ruc: '20000000003', tipo_vinculo: 'SinVinculo' })
  })

  it('envía el relacionado de una subsidiaria', () => {
    const entrada = construirProveedor({
      ...BORRADOR_PROVEEDOR_VACIO,
      razonSocial: 'Fumigaciones Demo',
      ruc: '20000000002',
      contacto: 'Rosa Demo',
      tipoVinculo: 'Subsidiaria',
      relacionado: PRINCIPAL,
    })
    expect(entrada.proveedor_relacionado_id).toBe(7)
    expect(entrada.contacto).toBe('Rosa Demo')
  })
})

describe('textoVinculo', () => {
  it('describe cada vínculo', () => {
    expect(textoVinculo({ tipo_vinculo: 'SinVinculo', proveedor_relacionado_nombre: null })).toBe('Sin vínculo')
    expect(textoVinculo({ tipo_vinculo: 'Principal', proveedor_relacionado_nombre: null })).toBe('Empresa principal')
    expect(textoVinculo({ tipo_vinculo: 'Subsidiaria', proveedor_relacionado_nombre: 'Servicios Verdes' })).toBe(
      'Subsidiaria de Servicios Verdes',
    )
  })
})

describe('normalizarMonto', () => {
  it.each([
    ['12000', '12000.00'],
    ['12 000,00', '12000.00'],
    ['12000.5', '12000.50'],
    ['0', '0.00'],
    ['1234567890,99', '1234567890.99'],
  ])('normaliza %j', (texto, esperado) => expect(normalizarMonto(texto)).toBe(esperado))

  it.each(['', 'abc', '-5', '10,123', '12.000,50', '12345678901', '1e5'])('rechaza %j', (texto) =>
    expect(normalizarMonto(texto)).toBeNull(),
  )
})

describe('validarContrato', () => {
  it('acepta un contrato completo', () => {
    expect(hayErrores(validarContrato(CONTRATO_VALIDO))).toBe(false)
  })

  it('señala todos los campos obligatorios que faltan', () => {
    const errores = validarContrato(BORRADOR_CONTRATO_VACIO)
    expect(Object.keys(errores).sort()).toEqual(['area', 'fin', 'frecuencia', 'inicio', 'monto', 'proveedor', 'tipoServicio'])
  })

  it('las condiciones son opcionales', () => {
    expect(hayErrores(validarContrato({ ...CONTRATO_VALIDO, condiciones: '' }))).toBe(false)
  })

  it('rechaza un fin anterior al inicio y fechas inexistentes', () => {
    expect(validarContrato({ ...CONTRATO_VALIDO, fin: '2025-12-31' }).fin).toMatch(/anterior/)
    expect(validarContrato({ ...CONTRATO_VALIDO, inicio: '2026-02-30' }).inicio).toBeDefined()
  })

  it('rechaza un monto inválido', () => {
    expect(validarContrato({ ...CONTRATO_VALIDO, monto: '12,3456' }).monto).toBeDefined()
  })
})

describe('construirContrato', () => {
  it('normaliza el monto y recorta los textos', () => {
    expect(construirContrato(CONTRATO_VALIDO)).toEqual({
      proveedor_id: 7,
      tipo_servicio_id: 3,
      area_metrado_estimado: '120 ejemplares',
      monto_fijo: '12000.00',
      frecuencia_pactada: '4 al año',
      vigencia_inicio: '2026-01-01',
      vigencia_fin: '2026-12-31',
      condiciones: 'Pago a 30 días',
    })
  })

  it('omite las condiciones vacías', () => {
    expect(construirContrato({ ...CONTRATO_VALIDO, condiciones: ' ' })).not.toHaveProperty('condiciones')
  })
})

describe('atención especial', () => {
  it('pide ejemplar y plaga', () => {
    const errores = validarEspecial(BORRADOR_ESPECIAL_VACIO)
    expect(errores.ejemplar).toBeDefined()
    expect(errores.plaga).toBeDefined()
    expect(errores.aplicaciones).toBeUndefined()
  })

  it('admite una o dos aplicaciones', () => {
    const base = { ejemplar: { id: 1, codigo: 'E-01', area_verde_id: null, area_verde_nombre: null }, plagaId: '2' }
    expect(hayErrores(validarEspecial({ ...base, aplicaciones: '1' }))).toBe(false)
    expect(hayErrores(validarEspecial({ ...base, aplicaciones: '2' }))).toBe(false)
    expect(validarEspecial({ ...base, aplicaciones: '3' }).aplicaciones).toBeDefined()
    expect(validarEspecial({ ...base, aplicaciones: '' }).aplicaciones).toBeDefined()
  })

  it('construye la entrada con números', () => {
    const entrada = construirEspecial({
      ejemplar: { id: 4, codigo: 'E-04', area_verde_id: null, area_verde_nombre: null },
      plagaId: '2',
      aplicaciones: '1',
    })
    expect(entrada).toEqual({ ejemplar_id: 4, plaga_id: 2, aplicaciones_adicionales: 1 })
  })

  it('formatea las aplicaciones', () => {
    expect(textoAplicaciones(1, 2)).toBe('1 de 2')
  })
})
