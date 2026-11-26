import { describe, expect, it } from 'vitest'
import { destinoSeguro, rutaCambiarContrasena, rutaIngreso } from './enlaces'

describe('enlaces de cuenta (AV-439)', () => {
  it('rutaIngreso lleva a /n/ingreso y solo conserva destinos internos', () => {
    expect(rutaIngreso()).toBe('/n/ingreso')
    expect(rutaIngreso('/pendientes')).toBe('/n/ingreso?volver=%2Fpendientes')
    expect(rutaIngreso('/')).toBe('/n/ingreso')
    expect(rutaIngreso('https://malo.example')).toBe('/n/ingreso')
    expect(rutaCambiarContrasena()).toBe('/n/cambiar-contrasena')
  })

  it('destinoSeguro rechaza externas y las pantallas de acceso de los dos diseños', () => {
    expect(destinoSeguro('/n/mapa?area=3')).toBe('/n/mapa?area=3')
    for (const malo of [
      '//x.com',
      'http://x.com',
      '/ingreso',
      '/cambiar-contrasena',
      '/n/ingreso?x=1',
      '/n/cambiar-contrasena',
      null,
      '',
    ]) {
      expect(destinoSeguro(malo)).toBeNull()
    }
  })
})
