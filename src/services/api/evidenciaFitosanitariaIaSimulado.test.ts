import { afterEach, describe, expect, it, vi } from 'vitest'
import { buscarEjemplaresEvidencia, listarAnalisisEvidencia } from './evidenciaFitosanitariaIa'

vi.mock('@/config/datosSimulados', () => ({ DATOS_SIMULADOS: true }))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('evidencia fitosanitaria con datos simulados', () => {
  // Margen amplio: la primera carga del módulo simulado con import() puede tardar en máquinas lentas.
  it('responde sin usar la red', { timeout: 20_000 }, async () => {
    const peticion = vi.fn()
    vi.stubGlobal('fetch', peticion)
    expect((await listarAnalisisEvidencia()).count).toBe(3)
    expect((await buscarEjemplaresEvidencia('palmera')).results.map((e) => e.codigo)).toEqual(['EJ-00519'])
    expect(peticion).not.toHaveBeenCalled()
  })
})
