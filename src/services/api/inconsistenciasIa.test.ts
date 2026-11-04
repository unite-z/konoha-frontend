import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  aceptarInconsistencia,
  analizarInconsistencias,
  descartarInconsistencia,
  listarInconsistencias,
  obtenerInconsistencia,
} from './inconsistenciasIa'

vi.mock('@/config/datosSimulados', () => ({ DATOS_SIMULADOS: false }))

afterEach(() => {
  vi.unstubAllGlobals()
})

function capturar(cuerpo: unknown = { id: 1 }, status = 200) {
  const peticion = vi.fn((_url: string, _opciones: RequestInit) => Promise.resolve(new Response(JSON.stringify(cuerpo), { status })))
  vi.stubGlobal('fetch', peticion)
  return peticion
}

describe('inconsistencias con el backend (RF-IA-002)', () => {
  it('lista con los filtros', async () => {
    const peticion = capturar({ count: 0, next: null, previous: null, results: [] })
    await listarInconsistencias({ estado: 'Propuesta', tipo_hallazgo: 'Duplicado', conjunto: 'Ejemplares', page: 2 })
    expect(peticion.mock.calls[0][0]).toBe('/api/v1/ia/inconsistencias/?estado=Propuesta&tipo_hallazgo=Duplicado&conjunto=Ejemplares&page=2')
  })

  it('analiza con un POST y el conjunto', async () => {
    const peticion = capturar({ analisis_id: 1, hallazgos: 0, sugerencias: [] }, 201)
    await analizarInconsistencias({ conjunto: 'Atenciones', desde: '2026-10-01', hasta: '2026-10-31' })
    const [url, opciones] = peticion.mock.calls[0]
    expect(url).toBe('/api/v1/ia/inconsistencias/analisis/')
    expect(opciones.method).toBe('POST')
    expect(JSON.parse(String(opciones.body))).toEqual({ conjunto: 'Atenciones', desde: '2026-10-01', hasta: '2026-10-31' })
  })

  it('obtiene, acepta y descarta con sus rutas y cuerpos', async () => {
    const peticion = capturar()
    await obtenerInconsistencia(3)
    await aceptarInconsistencia(3, { valor_final: '480 m²', comentario: 'Revisado' })
    await descartarInconsistencia(3, '')
    expect(peticion.mock.calls.map(([url, o]) => `${o.method} ${url}`)).toEqual([
      'GET /api/v1/ia/inconsistencias/3/',
      'POST /api/v1/ia/inconsistencias/3/validar/',
      'POST /api/v1/ia/inconsistencias/3/rechazar/',
    ])
    expect(JSON.parse(String(peticion.mock.calls[1][1].body))).toEqual({ valor_final: '480 m²', comentario: 'Revisado' })
    expect(JSON.parse(String(peticion.mock.calls[2][1].body))).toEqual({ motivo: null })
  })

  it('el 503 de la IA y el 409 llegan como ErrorApi', async () => {
    capturar({ codigo: 'ia-no-disponible', detalle: 'IA no disponible' }, 503)
    await expect(analizarInconsistencias({ conjunto: 'Ejemplares' })).rejects.toMatchObject({ estado: 503 })
    capturar({ codigo: 'conflicto', detalle: 'Ya revisado' }, 409)
    await expect(aceptarInconsistencia(3, {})).rejects.toMatchObject({ estado: 409 })
  })
})
