import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from './cliente'
import { alPerderSesion, construirUrlCore, leerCookie, solicitarCore } from './clienteCore'

afterEach(() => {
  vi.unstubAllGlobals()
  alPerderSesion(null)
})

function respuesta(estado: number, cuerpo: unknown): Response {
  return new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), { status: estado })
}

describe('leerCookie', () => {
  it('lee el token CSRF y decodifica su valor', () => {
    expect(leerCookie('XSRF-TOKEN', 'a=1; XSRF-TOKEN=ab%3Dc; b=2')).toBe('ab=c')
    expect(leerCookie('XSRF-TOKEN', 'a=1')).toBeNull()
  })
})

describe('construirUrlCore', () => {
  it('omite los parámetros vacíos', () => {
    expect(construirUrlCore('usuarios/', { rol: '', estado: 'activa', page: 2 })).toBe(
      '/api/v1/core/usuarios/?estado=activa&page=2',
    )
  })
})

describe('solicitarCore', () => {
  it('envía la cookie de sesión y el token CSRF en las escrituras', async () => {
    const fetchFalso = vi.fn(async () => respuesta(200, { ok: true }))
    vi.stubGlobal('fetch', fetchFalso)
    vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=token-1' })
    await solicitarCore('usuarios/', { metodo: 'POST', cuerpo: { a: 1 } })
    const [, init] = fetchFalso.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.credentials).toBe('same-origin')
    expect(new Headers(init.headers).get('X-XSRF-TOKEN')).toBe('token-1')
  })

  it('un 401 avisa de que la sesión se perdió y un 403 trae el mensaje del servidor', async () => {
    const perdida = vi.fn()
    alPerderSesion(perdida)
    vi.stubGlobal('fetch', vi.fn(async () => respuesta(401, { codigo: 'no-autenticado', detalle: 'Inicia sesión' })))
    await expect(solicitarCore('usuarios/')).rejects.toBeInstanceOf(ErrorApi)
    expect(perdida).toHaveBeenCalledTimes(1)

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => respuesta(403, { codigo: 'sin-permiso', detalle: 'No tiene permiso para esta acción' })),
    )
    await expect(solicitarCore('usuarios/')).rejects.toMatchObject({
      estado: 403,
      codigo: 'sin-permiso',
      detalle: 'No tiene permiso para esta acción',
    })
    expect(perdida).toHaveBeenCalledTimes(1)
  })

  it('un 401 al iniciar sesión no cuenta como sesión perdida', async () => {
    const perdida = vi.fn()
    alPerderSesion(perdida)
    vi.stubGlobal('fetch', vi.fn(async () => respuesta(401, { codigo: 'no-autenticado', detalle: 'Correo o contraseña incorrectos' })))
    await expect(solicitarCore('auth/login/', { metodo: 'POST', cuerpo: {} })).rejects.toMatchObject({ estado: 401 })
    expect(perdida).not.toHaveBeenCalled()
  })
})
