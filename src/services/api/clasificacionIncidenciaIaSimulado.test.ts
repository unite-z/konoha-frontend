import { afterEach, describe, expect, it, vi } from 'vitest'
import { listarIncidenciasPendientes } from './clasificacionIncidenciaIa'

vi.mock('@/config/datosSimulados', () => ({ DATOS_SIMULADOS: true }))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('clasificaciones de incidencias con datos simulados', () => {
  // Margen amplio: la primera carga del módulo simulado con import() puede tardar en máquinas lentas.
  it('responde las pendientes sin usar la red', { timeout: 20_000 }, async () => {
    const peticion = vi.fn()
    vi.stubGlobal('fetch', peticion)
    const pendientes = await listarIncidenciasPendientes()
    expect(pendientes.count).toBe(8)
    expect(peticion).not.toHaveBeenCalled()
  })
})
