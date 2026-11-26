// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ContextoSesion, type ValorSesion } from '@/sesion/ContextoSesion'
import type { SesionCore } from '@/types/core'
import { CLAVE_DISENO_NUEVO, reiniciarDisenoNuevoCuenta, useDisenoNuevo } from './useDisenoNuevo'

const api = vi.hoisted(() => ({ guardarAparienciaCuenta: vi.fn() }))
vi.mock('@/services/api/core', () => api)

const datos = new Map<string, string>()

beforeEach(() => {
  datos.clear()
  reiniciarDisenoNuevoCuenta()
  api.guardarAparienciaCuenta.mockReset().mockResolvedValue({})
  vi.stubGlobal('localStorage', {
    getItem: (clave: string) => datos.get(clave) ?? null,
    setItem: (clave: string, valor: string) => void datos.set(clave, valor),
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const TEMA = { tema: 'oscuro', acento: 'verde' } as const

function conSesion(apariencia: SesionCore['apariencia']) {
  const sesion: SesionCore = {
    usuario: { id: 1, nombre: 'Ana', nombre_usuario: 'ana' },
    rol: { codigo: 'superadmin', nombre: 'Superadministrador' },
    permisos: [],
    debe_cambiar_contrasena: false,
    expira: null,
    apariencia,
  }
  const valor = { estado: { tipo: 'activa', sesion } } as ValorSesion
  return ({ children }: { children: ReactNode }) => (
    <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>
  )
}

describe('useDisenoNuevo (AV-420)', () => {
  it('sin elegir, no cuenta como encendido', () => {
    const { result } = renderHook(() => useDisenoNuevo())
    expect(result.current.estado).toBe('sinElegir')
    expect(result.current.encendido).toBe(false)
  })

  it('guarda los tres estados en el navegador', async () => {
    const { result } = renderHook(() => useDisenoNuevo())
    await act(() => result.current.elegir(true))
    expect(result.current.estado).toBe('encendido')
    expect(datos.get(CLAVE_DISENO_NUEVO)).toBe('1')
    await act(() => result.current.elegir(false))
    expect(result.current.estado).toBe('apagado')
    expect(datos.get(CLAVE_DISENO_NUEVO)).toBe('0')
    expect(api.guardarAparienciaCuenta).not.toHaveBeenCalled()
  })

  it('apariencia sin la clave (backend sin AV-414): no llama a la cuenta ni rompe', async () => {
    const { result } = renderHook(() => useDisenoNuevo(), { wrapper: conSesion(TEMA) })
    await act(() => result.current.elegir(true))
    expect(result.current.estado).toBe('encendido')
    expect(result.current.camposCuenta).toEqual({})
    expect(api.guardarAparienciaCuenta).not.toHaveBeenCalled()
  })

  it('con la clave guarda en la cuenta junto al tema y al acento del navegador', async () => {
    const { result } = renderHook(() => useDisenoNuevo(), { wrapper: conSesion({ ...TEMA, diseno_nuevo: null }) })
    expect(result.current.camposCuenta).toEqual({ diseno_nuevo: null })
    await act(() => result.current.elegir(true))
    expect(api.guardarAparienciaCuenta).toHaveBeenCalledWith({
      tema: 'claro',
      acento: 'institucional',
      diseno_nuevo: true,
    })
    expect(result.current.camposCuenta).toEqual({ diseno_nuevo: true })
  })

  it('sin apariencia en la cuenta lo intenta; si sale bien, Apariencia ya lo conserva', async () => {
    const { result } = renderHook(() => useDisenoNuevo(), { wrapper: conSesion(null) })
    expect(result.current.camposCuenta).toEqual({})
    await act(() => result.current.elegir(false))
    expect(api.guardarAparienciaCuenta).toHaveBeenCalledTimes(1)
    const otra = renderHook(() => useDisenoNuevo(), { wrapper: conSesion(null) })
    expect(otra.result.current.camposCuenta).toEqual({ diseno_nuevo: false })
  })

  it('lee la cuenta si el navegador no ha elegido, y el navegador manda sobre la cuenta', async () => {
    const { result } = renderHook(() => useDisenoNuevo(), { wrapper: conSesion({ ...TEMA, diseno_nuevo: true }) })
    expect(result.current.estado).toBe('encendido')
    await act(() => result.current.elegir(false))
    expect(result.current.estado).toBe('apagado')
  })

  it('si la cuenta no lo guarda, rechaza pero el navegador ya lo tiene', async () => {
    api.guardarAparienciaCuenta.mockRejectedValue(new Error('sin red'))
    const { result } = renderHook(() => useDisenoNuevo(), { wrapper: conSesion({ ...TEMA, diseno_nuevo: false }) })
    await act(async () => {
      await expect(result.current.elegir(true)).rejects.toThrow()
    })
    expect(result.current.estado).toBe('encendido')
  })
})
