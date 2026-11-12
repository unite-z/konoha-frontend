import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ErrorApi,
  alPerderSesion,
  construirUrlHttp,
  datosDeError,
  descargarHttp,
  solicitarHttp,
} from './cliente'

function responder(estado: number, cuerpo: BodyInit | null = '{}') {
  const peticiones = vi.fn(async () => new Response(cuerpo, { status: estado }))
  vi.stubGlobal('fetch', peticiones)
  return peticiones
}

async function fallo(promesa: Promise<unknown>): Promise<ErrorApi> {
  try {
    await promesa
  } catch (error) {
    return error as ErrorApi
  }
  throw new Error('Se esperaba un error')
}

afterEach(() => {
  vi.unstubAllGlobals()
  alPerderSesion(null)
})

describe('cliente único: formatos de error', () => {
  it('{codigo, detalle} con errores por campo', async () => {
    responder(
      422,
      JSON.stringify({ codigo: 'validacion', detalle: 'Revisa el formulario', errores: { fecha: ['Obligatoria'] } }),
    )
    const error = await fallo(solicitarHttp('x/'))
    expect(error).toMatchObject({ estado: 422, codigo: 'validacion', detalle: 'Revisa el formulario', errores_campo: { fecha: ['Obligatoria'] } })
  })

  it('{detail} de DRF y de la autenticación', async () => {
    responder(403, JSON.stringify({ detail: 'Tu rol no tiene acceso' }))
    expect(await fallo(solicitarHttp('x/'))).toMatchObject({ estado: 403, codigo: null, detalle: 'Tu rol no tiene acceso' })
  })

  it('{campo: [mensajes]} de validación, con anidados', async () => {
    responder(400, JSON.stringify({ nombre: ['Obligatorio'], datos: { edad: ['Debe ser positiva'] } }))
    const error = await fallo(solicitarHttp('x/'))
    expect(error.estado).toBe(400)
    expect(error.errores_campo).toEqual({ nombre: ['Obligatorio'], datos: ['Debe ser positiva'] })
    expect(error.detalle).toBe('Obligatorio. Debe ser positiva')
  })

  it('cuerpo sin formato conocido o no JSON: mensaje genérico del servidor', async () => {
    responder(500, '<html>caído</html>')
    expect(await fallo(solicitarHttp('x/'))).toMatchObject({ estado: 500, detalle: expect.stringContaining('El servidor no pudo atender') })
  })

  it('sin conexión: estado 0; cancelada: AbortError sin envolver', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('red')))
    expect(await fallo(solicitarHttp('x/'))).toMatchObject({ estado: 0 })
    const cancelacion = new DOMException('cancelada', 'AbortError')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(cancelacion))
    await expect(solicitarHttp('x/')).rejects.toBe(cancelacion)
  })

  it('conserva el cuerpo completo del error para los campos extra', async () => {
    responder(409, JSON.stringify({ codigo: 'duplicada', detalle: 'Ya existe', cuenta_id: 7 }))
    expect(datosDeError(await fallo(solicitarHttp('x/')))).toMatchObject({ cuenta_id: 7 })
  })
})

describe('cliente único: sesión', () => {
  it('401 avisa a la sesión salvo con avisarSesion: false; 403 no', async () => {
    const perdida = vi.fn()
    alPerderSesion(perdida)
    responder(401, JSON.stringify({ detail: 'Sin sesión' }))
    await fallo(solicitarHttp('x/'))
    expect(perdida).toHaveBeenCalledTimes(1)
    await fallo(solicitarHttp('x/', { avisarSesion: false }))
    expect(perdida).toHaveBeenCalledTimes(1)
    responder(403, JSON.stringify({ detail: 'Sin permiso' }))
    expect(await fallo(solicitarHttp('x/'))).toMatchObject({ estado: 403 })
    expect(perdida).toHaveBeenCalledTimes(1)
  })

  it('cabeceras: CSRF solo en escrituras, Content-Type solo con cuerpo JSON y cabeceras extra', async () => {
    vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=t1' })
    const peticiones = responder(200)
    await solicitarHttp('x/', { metodo: 'PATCH', cuerpo: { a: 1 }, cabeceras: { 'Idempotency-Key': 'k' }, sinCache: true })
    const [, init] = peticiones.mock.calls[0] as unknown as [string, RequestInit]
    const cabeceras = new Headers(init.headers)
    expect(init).toMatchObject({ method: 'PATCH', credentials: 'same-origin', cache: 'no-store', body: '{"a":1}' })
    expect(cabeceras.get('X-XSRF-TOKEN')).toBe('t1')
    expect(cabeceras.get('Content-Type')).toBe('application/json')
    expect(cabeceras.get('Idempotency-Key')).toBe('k')

    await solicitarHttp('x/')
    const [, lectura] = peticiones.mock.calls[1] as unknown as [string, RequestInit]
    expect(new Headers(lectura.headers).get('X-XSRF-TOKEN')).toBeNull()
    expect(lectura).not.toHaveProperty('cache')
  })
})

describe('cliente único: URL y parámetros', () => {
  it('omite parámetros vacíos, codifica el resto y normaliza las barras de la base', () => {
    expect(construirUrlHttp('/a/b/', { q: 'jardín & poda', page: 2, vacio: '', nulo: null, no: undefined, ok: false }, '/api/z/')).toBe(
      '/api/z/a/b/?q=jard%C3%ADn+%26+poda&page=2&ok=false',
    )
    expect(construirUrlHttp('a/')).toBe('/api/v1/a/')
  })

  it('usa la base indicada en la petición', async () => {
    const peticiones = responder(200)
    await solicitarHttp('a/', { base: '/api/tercerizados', parametros: { page: 3 } })
    expect((peticiones.mock.calls[0] as unknown as [string])[0]).toBe('/api/tercerizados/a/?page=3')
  })
})

describe('cliente único: cuerpo 2xx y descargas', () => {
  it('tolerante: vacío o no JSON dan null; estricto falla si no es JSON; obligatorio falla también si está vacío', async () => {
    responder(200, '')
    expect(await solicitarHttp('x/')).toBeNull()
    responder(200, 'no json')
    expect(await solicitarHttp('x/')).toBeNull()
    await expect(solicitarHttp('x/', { cuerpoOk: 'estricto' })).rejects.toMatchObject({ estado: 200 })
    responder(204, null)
    expect(await solicitarHttp('x/', { cuerpoOk: 'estricto' })).toBeNull()
    await expect(solicitarHttp('x/', { cuerpoOk: 'obligatorio' })).rejects.toBeInstanceOf(ErrorApi)
  })

  it('descargarHttp devuelve el blob y las cabeceras; si falla, el ErrorApi del cuerpo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('datos', { status: 200, headers: { 'Content-Disposition': 'attachment; filename="a.pdf"' } })),
    )
    const { blob, cabeceras } = await descargarHttp('a/')
    expect(await blob.text()).toBe('datos')
    expect(cabeceras.get('Content-Disposition')).toContain('a.pdf')

    responder(404, JSON.stringify({ codigo: 'no-encontrado', detalle: 'No existe el archivo' }))
    expect(await fallo(descargarHttp('a/'))).toMatchObject({ estado: 404, detalle: 'No existe el archivo' })
  })
})
