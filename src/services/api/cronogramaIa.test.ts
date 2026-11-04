import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  confirmarCronograma,
  listarCronogramas,
  listarProgramacionExistente,
  obtenerCronograma,
  programacionExistenteDisponible,
  rechazarCronograma,
  solicitarCronograma,
} from './cronogramaIa'

vi.mock('@/config/datosSimulados', () => ({ DATOS_SIMULADOS: false }))

afterEach(() => {
  vi.unstubAllGlobals()
})

function capturar(cuerpo: unknown = { id: 1 }, status = 200) {
  const peticion = vi.fn((_url: string, _opciones: RequestInit) => Promise.resolve(new Response(JSON.stringify(cuerpo), { status })))
  vi.stubGlobal('fetch', peticion)
  return peticion
}

describe('cronogramas con el backend (RF-IA-003)', () => {
  it('lista con el estado y la página', async () => {
    const peticion = capturar({ count: 0, next: null, previous: null, results: [] })
    await listarCronogramas({ estado: 'Validada', page: 3 })
    expect(peticion.mock.calls[0][0]).toBe('/api/v1/ia/cronogramas/?estado=Validada&page=3')
  })

  it('genera con un POST y el periodo', async () => {
    const peticion = capturar({ id: 4 }, 201)
    await solicitarCronograma({ desde: '2026-12-01', hasta: '2026-12-31', tipo_servicio_ids: [1], modalidad: 'Tercerizado' })
    const [url, opciones] = peticion.mock.calls[0]
    expect(url).toBe('/api/v1/ia/cronogramas/')
    expect(opciones.method).toBe('POST')
    expect(JSON.parse(String(opciones.body))).toEqual({ desde: '2026-12-01', hasta: '2026-12-31', tipo_servicio_ids: [1], modalidad: 'Tercerizado' })
  })

  it('obtiene, confirma y rechaza con sus rutas', async () => {
    const peticion = capturar()
    const cuerpo = { por_propuesta: { 'p-1': { accion: 'aceptar' as const, valores_finales: null, confirma_restriccion: false } } }
    await obtenerCronograma(4)
    await confirmarCronograma(4, cuerpo)
    await rechazarCronograma(4, 'Manual')
    expect(peticion.mock.calls.map(([url, o]) => `${o.method} ${url}`)).toEqual([
      'GET /api/v1/ia/cronogramas/4/',
      'POST /api/v1/ia/cronogramas/4/validar/',
      'POST /api/v1/ia/cronogramas/4/rechazar/',
    ])
    expect(JSON.parse(String(peticion.mock.calls[1][1].body))).toEqual(cuerpo)
    expect(JSON.parse(String(peticion.mock.calls[2][1].body))).toEqual({ motivo: 'Manual' })
  })

  it('el 422 de RI-25 conserva los errores por propuesta', async () => {
    capturar({ codigo: 'restriccion-sin-confirmar', detalle: 'Falta confirmar', errores: { 'p-12': ['Confirma'] } }, 422)
    await expect(confirmarCronograma(4, { por_propuesta: {} })).rejects.toMatchObject({
      estado: 422,
      codigo: 'restriccion-sin-confirmar',
      errores_campo: { 'p-12': ['Confirma'] },
    })
  })
})

describe('programación existente con el backend', () => {
  it('mientras MOD-03 no publique el listado, no llama a la red y devuelve una lista vacía', async () => {
    const peticion = capturar([])
    expect(programacionExistenteDisponible()).toBe(false)
    expect(await listarProgramacionExistente('2026-11-01', '2026-11-30')).toEqual([])
    expect(peticion).not.toHaveBeenCalled()
  })
})
