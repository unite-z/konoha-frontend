import { afterEach, describe, expect, it, vi } from 'vitest'
import { listarInconsistencias } from './inconsistenciasIa'

vi.mock('../../config/datosSimulados', () => ({ DATOS_SIMULADOS: true }))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('inconsistencias con datos simulados', () => {
  it('responde la bandeja sin usar la red', async () => {
    const peticion = vi.fn()
    vi.stubGlobal('fetch', peticion)
    const bandeja = await listarInconsistencias({})
    expect(bandeja.count).toBe(12)
    expect(peticion).not.toHaveBeenCalled()
  })
})
