import { describe, expect, it } from 'vitest'
import { RUTAS_CORE, destinoTrasIngresoCore, rutaIngresoCore } from './rutasApp'

describe('destinoTrasIngresoCore', () => {
  it('acepta rutas internas con consulta', () => {
    expect(destinoTrasIngresoCore('/usuarios-roles/usuarios/3?x=1')).toBe('/usuarios-roles/usuarios/3?x=1')
    expect(destinoTrasIngresoCore('/reportes-indicadores/reportes')).toBe('/reportes-indicadores/reportes')
  })

  it.each([
    null,
    '',
    'https://malicioso.example/x',
    '//malicioso.example/x',
    '/\\malicioso.example',
    'usuarios',
    RUTAS_CORE.ingreso,
    `${RUTAS_CORE.ingreso}?volver=/x`,
    RUTAS_CORE.cambiarContrasena,
    '/repositorio\n',
  ])('rechaza %j', (volver) => {
    expect(destinoTrasIngresoCore(volver)).toBeNull()
  })
})

describe('rutaIngresoCore', () => {
  it('codifica el destino válido y omite el resto', () => {
    expect(rutaIngresoCore('/repositorio?tipo=jardin')).toBe('/ingreso?volver=%2Frepositorio%3Ftipo%3Djardin')
    expect(rutaIngresoCore('https://malicioso.example')).toBe('/ingreso')
    expect(rutaIngresoCore('/')).toBe('/ingreso')
  })
})
