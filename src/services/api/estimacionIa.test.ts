import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buscarActividadesEstimables,
  confirmarEstimacion,
  descartarEstimacion,
  listarEstimaciones,
  obtenerEstimacion,
  registrarRecursosManual,
  solicitarEstimacion,
} from './estimacionIa'

vi.mock('../../config/datosSimulados', () => ({ DATOS_SIMULADOS: false }))

afterEach(() => {
  vi.unstubAllGlobals()
})

function capturar(cuerpo: unknown = { id: 1 }, status = 200) {
  const peticion = vi.fn((_url: string, _opciones: RequestInit) => Promise.resolve(new Response(JSON.stringify(cuerpo), { status })))
  vi.stubGlobal('fetch', peticion)
  return peticion
}

const CONFIRMADO = { operarios: 3, duracion: 6, unidad_duracion: 'horas' as const, insumos: [{ nombre: 'Guantes', cantidad: 4, unidad: 'u' }] }

describe('estimaciones con el backend (RF-IA-004)', () => {
  it('lista y busca actividades estimables', async () => {
    const peticion = capturar({ count: 0, next: null, previous: null, results: [] })
    await listarEstimaciones({ estado: 'Propuesta', page: 2 })
    await buscarActividadesEstimables('jardín')
    expect(peticion.mock.calls[0][0]).toBe('/api/v1/ia/estimaciones/?estado=Propuesta&page=2')
    expect(peticion.mock.calls[1][0]).toBe('/api/v1/ia/estimaciones/actividades-pendientes/?q=jard%C3%ADn')
  })

  it('solicita, confirma, descarta y registra en manual con sus rutas y cuerpos', async () => {
    const peticion = capturar()
    await solicitarEstimacion({ actividad_id: 4100 })
    await obtenerEstimacion(7)
    await confirmarEstimacion(7, { acciones: { operarios: 'aceptar', duracion: 'corregir', insumos: 'descartar' }, confirmado: CONFIRMADO })
    await descartarEstimacion(7, '')
    await registrarRecursosManual({ actividad_id: 4100, confirmado: CONFIRMADO })
    expect(peticion.mock.calls.map(([url, o]) => `${o.method} ${url}`)).toEqual([
      'POST /api/v1/ia/estimaciones/',
      'GET /api/v1/ia/estimaciones/7/',
      'POST /api/v1/ia/estimaciones/7/validar/',
      'POST /api/v1/ia/estimaciones/7/rechazar/',
      'POST /api/v1/ia/estimaciones/manual/',
    ])
    expect(JSON.parse(String(peticion.mock.calls[0][1].body))).toEqual({ actividad_id: 4100 })
    expect(JSON.parse(String(peticion.mock.calls[3][1].body))).toEqual({ motivo: null })
    expect(JSON.parse(String(peticion.mock.calls[4][1].body))).toEqual({ actividad_id: 4100, confirmado: CONFIRMADO })
  })

  it('el 503 de la IA llega como ErrorApi', async () => {
    capturar({ codigo: 'ia-no-disponible', detalle: 'IA no disponible' }, 503)
    await expect(solicitarEstimacion({ actividad_id: 1 })).rejects.toMatchObject({ estado: 503 })
  })
})
