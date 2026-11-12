import { afterEach, describe, expect, it, vi } from 'vitest'
import { alPerderSesion } from './cliente'
import { cargarAreasVerdesGeoJSON } from './mapaInventario'
import { campoApi } from './operacionCampo'

afterEach(() => {
  vi.unstubAllGlobals()
  alPerderSesion(null)
})

const capa = { type: 'FeatureCollection', features: [] }

function urls(peticiones: ReturnType<typeof vi.fn>): string[] {
  return peticiones.mock.calls.map((c) => (c as unknown as [string])[0])
}

describe('cargarAreasVerdesGeoJSON sobre el cliente único', () => {
  it('pide la capa al inventario con el Accept de GeoJSON', async () => {
    const peticiones = vi.fn(async () => new Response(JSON.stringify(capa)))
    vi.stubGlobal('fetch', peticiones)
    expect(await cargarAreasVerdesGeoJSON()).toEqual(capa)
    const [url, init] = peticiones.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/v1/inventario/mapa/geometria')
    expect(new Headers(init.headers).get('Accept')).toBe('application/geo+json, application/json')
    expect(init).toMatchObject({ method: 'GET', credentials: 'same-origin' })
  })

  it('si el servidor responde 404 usa el archivo estático', async () => {
    const peticiones = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(capa)))
    vi.stubGlobal('fetch', peticiones)
    await cargarAreasVerdesGeoJSON()
    expect(urls(peticiones)).toEqual(['/api/v1/inventario/mapa/geometria', '/datos/areas-verdes.geojson'])
  })

  it('un error del servidor sale con su mensaje, un 401 no cierra la sesión y sin conexión es estado 0', async () => {
    const perdida = vi.fn()
    alPerderSesion(perdida)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 401 })),
    )
    await expect(cargarAreasVerdesGeoJSON()).rejects.toMatchObject({
      estado: 401,
      detalle: 'No pudimos cargar las áreas del mapa del campus.',
    })
    expect(perdida).not.toHaveBeenCalled()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('red')))
    await expect(cargarAreasVerdesGeoJSON()).rejects.toMatchObject({ estado: 0 })
  })

  it('una cancelación se propaga sin envolver', async () => {
    const cancelacion = new DOMException('cancelada', 'AbortError')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(cancelacion))
    await expect(cargarAreasVerdesGeoJSON()).rejects.toBe(cancelacion)
  })
})

describe('campoApi sobre el cliente único', () => {
  it('envía Idempotency-Key, cuerpo JSON y no reutiliza respuestas', async () => {
    const peticiones = vi.fn(async () => new Response('{"id":1}', { status: 201 }))
    vi.stubGlobal('fetch', peticiones)
    vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=t' })
    expect(await campoApi('marcas/', { metodo: 'POST', cuerpo: { a: 1 }, claveIdempotencia: 'clave-1' })).toEqual({
      id: 1,
    })
    const [url, init] = peticiones.mock.calls[0] as unknown as [string, RequestInit]
    const cabeceras = new Headers(init.headers)
    expect(url).toBe('/api/v1/operacion-campo/marcas/')
    expect(init).toMatchObject({ cache: 'no-store', credentials: 'same-origin' })
    expect(cabeceras.get('Idempotency-Key')).toBe('clave-1')
    expect(cabeceras.get('Content-Type')).toBe('application/json')
    expect(cabeceras.get('X-XSRF-TOKEN')).toBe('t')
  })

  it('un cuerpo 2xx vacío o no JSON es un error (el contrato de MOD-04 siempre devuelve JSON)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 200 })),
    )
    await expect(campoApi('x/')).rejects.toMatchObject({ estado: 200 })
  })

  it('entiende {detail} y la validación por campo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ detail: 'Sin permiso' }), { status: 403 })),
    )
    await expect(campoApi('x/')).rejects.toMatchObject({ estado: 403, detalle: 'Sin permiso' })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ hora: ['Obligatoria'] }), { status: 400 })),
    )
    await expect(campoApi('x/')).rejects.toMatchObject({ estado: 400, errores_campo: { hora: ['Obligatoria'] } })
  })
})
