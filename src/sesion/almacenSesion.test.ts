import { describe, expect, it } from 'vitest'
import { CLAVE_SESION, borrarAutorizacion, guardarAutorizacion, leerAutorizacion, type AlmacenClaveValor } from './almacenSesion'

function almacenEnMemoria(): AlmacenClaveValor & { datos: Map<string, string> } {
  const datos = new Map<string, string>()
  return {
    datos,
    getItem: (clave) => datos.get(clave) ?? null,
    setItem: (clave, valor) => void datos.set(clave, valor),
    removeItem: (clave) => void datos.delete(clave),
  }
}

const fallido: AlmacenClaveValor = {
  getItem: () => {
    throw new Error('bloqueado')
  },
  setItem: () => {
    throw new Error('lleno')
  },
  removeItem: () => {
    throw new Error('bloqueado')
  },
}

describe('almacenSesion', () => {
  it('guarda, lee y borra la cabecera', () => {
    const almacen = almacenEnMemoria()
    expect(guardarAutorizacion('Basic YWRtaW46Y2xhdmU=', almacen)).toBe(true)
    expect(almacen.datos.get(CLAVE_SESION)).toBe('Basic YWRtaW46Y2xhdmU=')
    expect(leerAutorizacion(almacen)).toBe('Basic YWRtaW46Y2xhdmU=')
    borrarAutorizacion(almacen)
    expect(leerAutorizacion(almacen)).toBeNull()
  })

  it('ignora valores que no son una cabecera Basic', () => {
    const almacen = almacenEnMemoria()
    almacen.datos.set(CLAVE_SESION, 'Bearer abc')
    expect(leerAutorizacion(almacen)).toBeNull()
    almacen.datos.set(CLAVE_SESION, 'Basic <script>')
    expect(leerAutorizacion(almacen)).toBeNull()
  })

  it('no falla si el almacenamiento no está disponible', () => {
    expect(leerAutorizacion(null)).toBeNull()
    expect(guardarAutorizacion('Basic YQ==', null)).toBe(false)
    expect(() => borrarAutorizacion(null)).not.toThrow()
    expect(leerAutorizacion(fallido)).toBeNull()
    expect(guardarAutorizacion('Basic YQ==', fallido)).toBe(false)
    expect(() => borrarAutorizacion(fallido)).not.toThrow()
  })
})
