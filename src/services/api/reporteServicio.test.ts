import { afterEach, describe, expect, it, vi } from 'vitest'
import { obtenerCatalogoServicios, obtenerReporteServicio } from './reportesGestion'

vi.mock('@/config/datosSimulados', () => ({ DATOS_SIMULADOS: false }))

afterEach(() => {
  vi.unstubAllGlobals()
})

const respuesta = (cuerpo: unknown) => new Response(JSON.stringify(cuerpo), { status: 200 })

describe('obtenerReporteServicio con el backend (RF-REP-008)', () => {
  it('hace un GET a servicios-tercerizados/ con el periodo y los filtros, sin cuerpo', async () => {
    const peticion = vi.fn().mockResolvedValue(respuesta({ sin_datos: true }))
    vi.stubGlobal('fetch', peticion)
    await obtenerReporteServicio({ desde: '2026-10-01', hasta: '2026-10-31', tipo_servicio_id: 2, proveedor_id: 101 })
    const [url, opciones] = peticion.mock.calls[0]
    expect(url).toBe('/api/v1/reportes/servicios-tercerizados/?desde=2026-10-01&hasta=2026-10-31&tipo_servicio_id=2&proveedor_id=101')
    expect(opciones.method).toBe('GET')
    expect(opciones.body).toBeUndefined()
  })

  it('omite el proveedor y el contrato si no se eligen', async () => {
    const peticion = vi.fn().mockResolvedValue(respuesta({ sin_datos: true }))
    vi.stubGlobal('fetch', peticion)
    await obtenerReporteServicio({ desde: '2026-10-01', hasta: '2026-10-31', tipo_servicio_id: 1 })
    expect(peticion.mock.calls[0][0]).toBe('/api/v1/reportes/servicios-tercerizados/?desde=2026-10-01&hasta=2026-10-31&tipo_servicio_id=1')
  })
})

describe('obtenerCatalogoServicios con el backend', () => {
  it('lee los catálogos de MOD-05 y deja solo los tipos tercerizados', async () => {
    const peticion = vi.fn((url: string) =>
      Promise.resolve(
        url.includes('tipos-servicio')
          ? respuesta({ results: [{ id: 1, nombre: 'Corte de césped', ejecutor: 'Tercerizado' }, { id: 5, nombre: 'Riego', ejecutor: 'Propio' }], next: null })
          : respuesta({ results: [{ id: 101, razon_social: 'Proveedor (demo)', activo: true }], next: null }),
      ),
    )
    vi.stubGlobal('fetch', peticion)
    const catalogo = await obtenerCatalogoServicios()
    expect(catalogo).toEqual({
      tipos_servicio: [{ id: 1, nombre: 'Corte de césped' }],
      proveedores: [{ id: 101, nombre: 'Proveedor (demo)' }],
      completo: true,
    })
    expect(peticion.mock.calls.every(([url]) => url.includes('/catalogos/'))).toBe(true)
  })
})
