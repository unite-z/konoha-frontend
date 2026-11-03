import { afterEach, describe, expect, it, vi } from 'vitest'
import { listarCronogramas } from './cronogramaIa'

vi.mock('../../config/datosSimulados', () => ({ DATOS_SIMULADOS: true }))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('cronogramas con datos simulados', () => {
  // Margen amplio: la primera carga del módulo simulado con import() puede tardar en máquinas lentas.
  it('responde la bandeja sin usar la red', { timeout: 20_000 }, async () => {
    const peticion = vi.fn()
    vi.stubGlobal('fetch', peticion)
    const bandeja = await listarCronogramas({})
    expect(bandeja.results.map((s) => s.estado).sort()).toEqual(['Propuesta', 'Rechazada', 'Validada'])
    expect(peticion).not.toHaveBeenCalled()
  })
})
