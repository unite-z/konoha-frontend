import { afterEach, describe, expect, it, vi } from 'vitest'
import { listarPriorizaciones } from './priorizacionIa'

vi.mock('../../config/datosSimulados', () => ({ DATOS_SIMULADOS: true }))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('priorizaciones con datos simulados', () => {
  it('responde la bandeja sin usar la red', async () => {
    const peticion = vi.fn()
    vi.stubGlobal('fetch', peticion)
    const bandeja = await listarPriorizaciones({})
    expect(bandeja.results.map((s) => s.estado)).toEqual(['Propuesta', 'Validada', 'Rechazada'])
    expect(peticion).not.toHaveBeenCalled()
  })
})
