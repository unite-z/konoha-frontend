import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi, alPerderSesion, solicitar } from './cliente'

function responder(estado: number, cuerpo: unknown = {}) {
  const peticiones = vi.fn(async () => new Response(JSON.stringify(cuerpo), { status: estado }))
  vi.stubGlobal('fetch', peticiones)
  return peticiones
}

function cabeceras(peticiones: ReturnType<typeof responder>): Record<string, string> {
  const [, opciones] = peticiones.mock.calls[0] as unknown as [string, RequestInit]
  return opciones.headers as Record<string, string>
}

afterEach(() => {
  vi.unstubAllGlobals()
  alPerderSesion(null)
})

describe('solicitar con la sesión de MOD-01', () => {
  it('las escrituras reenvían la cookie XSRF-TOKEN; las lecturas no', async () => {
    vi.stubGlobal('document', { cookie: 'a=1; XSRF-TOKEN=ab%3Dc' })

    const escritura = responder(201)
    await solicitar('ia/extracciones/', { metodo: 'POST', cuerpo: { reporte_id: 1 } })
    expect(cabeceras(escritura)['X-XSRF-TOKEN']).toBe('ab=c')

    const lectura = responder(200)
    await solicitar('ia/extracciones/')
    expect(cabeceras(lectura)['X-XSRF-TOKEN']).toBeUndefined()
  })

  it('un 401 avisa de que la sesión se perdió y lanza el error', async () => {
    const perdida = vi.fn()
    alPerderSesion(perdida)
    responder(401, { codigo: 'no-autenticado', detalle: 'Inicia sesión para continuar' })

    await expect(solicitar('reportes/cumplimiento-corte/')).rejects.toBeInstanceOf(ErrorApi)
    expect(perdida).toHaveBeenCalledOnce()
  })

  it('un 403 no da la sesión por perdida', async () => {
    const perdida = vi.fn()
    alPerderSesion(perdida)
    responder(403, { detail: 'Tu rol no tiene acceso a esta función' })

    await expect(solicitar('ia/extracciones/metricas/')).rejects.toMatchObject({ estado: 403 })
    expect(perdida).not.toHaveBeenCalled()
  })
})
