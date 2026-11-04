import { afterEach, describe, expect, it, vi } from 'vitest'
import { listarEstimaciones } from './estimacionIa'

vi.mock('@/config/datosSimulados', () => ({ DATOS_SIMULADOS: true }))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('estimaciones con datos simulados', () => {
  // Margen amplio: la primera carga del módulo simulado con import() puede tardar en máquinas lentas.
  it('responde la lista sin usar la red', { timeout: 20_000 }, async () => {
    const peticion = vi.fn()
    vi.stubGlobal('fetch', peticion)
    const lista = await listarEstimaciones({})
    expect(lista.results.map((s) => s.estado).sort()).toEqual(['Propuesta', 'Rechazada', 'Validada'])
    expect(peticion).not.toHaveBeenCalled()
  })
})
