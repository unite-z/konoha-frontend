import { afterEach, describe, expect, it, vi } from 'vitest'
import { obtenerCatalogoComparacion, obtenerProgramadoEjecutado } from './reportesGestion'

vi.mock('@/config/datosSimulados', () => ({ DATOS_SIMULADOS: true }))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('RF-REP-010 con datos simulados', () => {
  it('responde la comparación y los catálogos sin usar la red', async () => {
    const peticion = vi.fn()
    vi.stubGlobal('fetch', peticion)
    const [comparacion, catalogo] = await Promise.all([
      obtenerProgramadoEjecutado({ desde: '2000-01-01', hasta: '2100-12-31' }),
      obtenerCatalogoComparacion(),
    ])
    expect(comparacion.filas).toHaveLength(40)
    expect(catalogo.tipos_servicio).toHaveLength(4)
    expect(peticion).not.toHaveBeenCalled()
  })
})
