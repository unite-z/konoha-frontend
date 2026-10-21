import { describe, expect, it } from 'vitest'
import { RUTAS_TERCERIZADOS, destinoTrasIngreso, esRutaTercerizados, rutaDetalleAtencion, rutaIngreso } from './rutasApp'

const BANDEJA = RUTAS_TERCERIZADOS.atenciones

describe('esRutaTercerizados', () => {
  it('reconoce el prefijo exacto', () => {
    expect(esRutaTercerizados('/servicios-tercerizados')).toBe(true)
    expect(esRutaTercerizados('/servicios-tercerizados/atenciones/3')).toBe(true)
    expect(esRutaTercerizados('/servicios-tercerizadosX')).toBe(false)
    expect(esRutaTercerizados('/reportes-indicadores/reportes')).toBe(false)
  })
})

describe('destinoTrasIngreso', () => {
  it('acepta rutas internas de MOD-05 con consulta', () => {
    expect(destinoTrasIngreso(rutaDetalleAtencion(7))).toBe('/servicios-tercerizados/atenciones/7')
    expect(destinoTrasIngreso(`${BANDEJA}?estado=En%20ejecuci%C3%B3n`)).toBe(`${BANDEJA}?estado=En%20ejecuci%C3%B3n`)
  })

  it.each([
    null,
    '',
    'https://malicioso.example/servicios-tercerizados',
    '//malicioso.example/servicios-tercerizados',
    '/\\malicioso.example',
    'servicios-tercerizados/atenciones',
    '/reportes-indicadores/reportes',
    RUTAS_TERCERIZADOS.ingreso,
    `${RUTAS_TERCERIZADOS.ingreso}?volver=/x`,
    '/servicios-tercerizados/atenciones\n',
  ])('devuelve la bandeja para %j', (volver) => {
    expect(destinoTrasIngreso(volver)).toBe(BANDEJA)
  })
})

describe('rutaIngreso', () => {
  it('codifica el destino válido', () => {
    expect(rutaIngreso('/servicios-tercerizados/atenciones/7?x=1')).toBe(
      '/servicios-tercerizados/ingreso?volver=%2Fservicios-tercerizados%2Fatenciones%2F7%3Fx%3D1',
    )
  })

  it('omite destinos no válidos o vacíos', () => {
    expect(rutaIngreso()).toBe(RUTAS_TERCERIZADOS.ingreso)
    expect(rutaIngreso('//otro.example')).toBe(RUTAS_TERCERIZADOS.ingreso)
  })
})
