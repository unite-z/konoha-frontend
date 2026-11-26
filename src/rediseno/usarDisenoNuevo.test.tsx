// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ContextoSesion, type ValorSesion } from '@/sesion/ContextoSesion'
import type { SesionCore } from '@/types/core'
import { CLAVE_DISENO_NUEVO, useDisenoNuevo } from './usarDisenoNuevo'

const api = vi.hoisted(() => ({ guardarDisenoNuevoCuenta: vi.fn() }))
vi.mock('@/services/api/core', () => api)

const datos = new Map<string, string>()

beforeEach(() => {
  datos.clear()
  api.guardarDisenoNuevoCuenta.mockReset().mockResolvedValue({})
  vi.stubGlobal('localStorage', {
    getItem: (clave: string) => datos.get(clave) ?? null,
    setItem: (clave: string, valor: string) => void datos.set(clave, valor),
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function conSesion(extra: Partial<SesionCore>) {
  const sesion: SesionCore = {
    usuario: { id: 1, nombre: 'Ana', nombre_usuario: 'ana' },
    rol: { codigo: 'superadmin', nombre: 'Superadministrador' },
    permisos: [],
    debe_cambiar_contrasena: false,
    expira: null,
    ...extra,
  }
  const valor = { estado: { tipo: 'activa', sesion } } as ValorSesion
  return ({ children }: { children: ReactNode }) => <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>
}

describe('usarDisenoNuevo (AV-420)', () => {
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
    expect(api.guardarDisenoNuevoCuenta).not.toHaveBeenCalled()
  })

  it('sin la clave en la sesión no llama a la cuenta; con ella, sí', async () => {
    const sin = renderHook(() => useDisenoNuevo(), { wrapper: conSesion({}) })
    await act(() => sin.result.current.elegir(true))
    expect(api.guardarDisenoNuevoCuenta).not.toHaveBeenCalled()
    datos.clear()
    const con = renderHook(() => useDisenoNuevo(), { wrapper: conSesion({ diseno_nuevo: null }) })
    await act(() => con.result.current.elegir(true))
    expect(api.guardarDisenoNuevoCuenta).toHaveBeenCalledWith(expect.anything(), true)
  })

  it('lee la cuenta si el navegador no ha elegido, y el navegador manda sobre la cuenta', async () => {
    const { result } = renderHook(() => useDisenoNuevo(), { wrapper: conSesion({ diseno_nuevo: true }) })
    expect(result.current.estado).toBe('encendido')
    await act(() => result.current.elegir(false))
    expect(result.current.estado).toBe('apagado')
  })

  it('si la cuenta no lo guarda, rechaza pero el navegador ya lo tiene', async () => {
    api.guardarDisenoNuevoCuenta.mockRejectedValue(new Error('sin red'))
    const { result } = renderHook(() => useDisenoNuevo(), { wrapper: conSesion({ diseno_nuevo: false }) })
    await act(async () => {
      await expect(result.current.elegir(true)).rejects.toThrow()
    })
    expect(result.current.estado).toBe('encendido')
  })
})
