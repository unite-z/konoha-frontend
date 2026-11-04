import { afterEach, describe, expect, it, vi } from 'vitest'
import { listarPriorizaciones, obtenerPriorizacion, rechazarPriorizacion, solicitarPriorizacion, validarPriorizacion } from './priorizacionIa'

vi.mock('@/config/datosSimulados', () => ({ DATOS_SIMULADOS: false }))

afterEach(() => {
  vi.unstubAllGlobals()
})

const respuesta = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status })

function capturar(cuerpo: unknown = { id: 1 }, status = 200) {
  const peticion = vi.fn((_url: string, _opciones: RequestInit) => Promise.resolve(respuesta(cuerpo, status)))
  vi.stubGlobal('fetch', peticion)
  return peticion
}

describe('priorizaciones con el backend (RN-IA-002)', () => {
  it('lista con el estado y la página', async () => {
    const peticion = capturar({ count: 0, next: null, previous: null, results: [] })
    await listarPriorizaciones({ estado: 'Propuesta', page: 2 })
    expect(peticion.mock.calls[0][0]).toBe('/api/v1/ia/priorizaciones/?estado=Propuesta&page=2')
    expect(peticion.mock.calls[0][1].method).toBe('GET')
  })

  it('solicita con un POST y el cuerpo de la solicitud', async () => {
    const peticion = capturar({ id: 9 }, 201)
    await solicitarPriorizacion({ alcance: 'Ejemplares', area_verde_id: 12, horizonte_dias: 15 })
    const [url, opciones] = peticion.mock.calls[0]
    expect(url).toBe('/api/v1/ia/priorizaciones/')
    expect(opciones.method).toBe('POST')
    expect(JSON.parse(String(opciones.body))).toEqual({ alcance: 'Ejemplares', area_verde_id: 12, horizonte_dias: 15 })
  })

  it('obtiene, valida y rechaza con sus rutas', async () => {
    const peticion = capturar()
    await obtenerPriorizacion(4)
    await validarPriorizacion(4, { por_elemento: { 'area-12': { accion: 'corregir', prioridad_final: 'Alta' } } })
    await rechazarPriorizacion(4, '')
    expect(peticion.mock.calls.map(([url, o]) => `${o.method} ${url}`)).toEqual([
      'GET /api/v1/ia/priorizaciones/4/',
      'POST /api/v1/ia/priorizaciones/4/validar/',
      'POST /api/v1/ia/priorizaciones/4/rechazar/',
    ])
    expect(JSON.parse(String(peticion.mock.calls[1][1].body))).toEqual({ por_elemento: { 'area-12': { accion: 'corregir', prioridad_final: 'Alta' } } })
    expect(JSON.parse(String(peticion.mock.calls[2][1].body))).toEqual({ motivo: null })
  })

  it('el 503 de la IA llega como ErrorApi', async () => {
    capturar({ codigo: 'ia-no-disponible', detalle: 'El servicio de IA no está disponible' }, 503)
    await expect(solicitarPriorizacion({ alcance: 'Ambos', horizonte_dias: 7 })).rejects.toMatchObject({
      estado: 503,
      codigo: 'ia-no-disponible',
    })
  })
})
