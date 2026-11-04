import { afterEach, describe, expect, it, vi } from 'vitest'
import { obtenerCatalogoServicios, obtenerReporteServicio } from './reportesGestion'

vi.mock('@/config/datosSimulados', () => ({ DATOS_SIMULADOS: true }))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('RF-REP-008 con datos simulados', () => {
  it('responde el reporte y los catálogos sin usar la red', async () => {
    const peticion = vi.fn()
    vi.stubGlobal('fetch', peticion)
    const reporte = obtenerReporteServicio({ desde: '2026-01-01', hasta: '2026-12-31', tipo_servicio_id: 2 })
    const catalogo = obtenerCatalogoServicios()
    expect((await reporte).servicio.nombre).toBe('Control fitosanitario')
    expect((await catalogo).tipos_servicio).toHaveLength(4)
    expect(peticion).not.toHaveBeenCalled()
  })
})
