import { afterEach, describe, expect, it, vi } from 'vitest'
import { obtenerCatalogoComparacion, obtenerProgramadoEjecutado } from './reportesGestion'

vi.mock('@/config/datosSimulados', () => ({ DATOS_SIMULADOS: false }))

afterEach(() => {
  vi.unstubAllGlobals()
})

const respuesta = (cuerpo: unknown) => new Response(JSON.stringify(cuerpo), { status: 200 })

describe('obtenerProgramadoEjecutado con el backend (RF-REP-010)', () => {
  it('hace un GET con el periodo y los filtros, sin cuerpo', async () => {
    const peticion = vi.fn().mockResolvedValue(respuesta({ sin_datos: true }))
    vi.stubGlobal('fetch', peticion)
    await obtenerProgramadoEjecutado({ desde: '2026-10-01', hasta: '2026-10-31', area_verde_id: 12, modalidad: 'Tercerizado' })
    const [url, opciones] = peticion.mock.calls[0]
    expect(url).toBe('/api/v1/reportes/programado-ejecutado/?desde=2026-10-01&hasta=2026-10-31&area_verde_id=12&modalidad=Tercerizado')
    expect(opciones.method).toBe('GET')
    expect(opciones.body).toBeUndefined()
  })
})

describe('obtenerCatalogoComparacion con el backend', () => {
  it('lee todos los tipos de servicio y los espacios de MOD-05', async () => {
    const peticion = vi.fn((url: string) =>
      Promise.resolve(
        url.includes('tipos-servicio')
          ? respuesta({ results: [{ id: 5, nombre: 'Mantenimiento', ejecutor: 'Propio' }], next: null })
          : respuesta({ results: [{ id: 12, nombre: 'Tontódromo' }], next: null }),
      ),
    )
    vi.stubGlobal('fetch', peticion)
    expect(await obtenerCatalogoComparacion()).toEqual({
      tipos_servicio: [{ id: 5, nombre: 'Mantenimiento' }],
      espacios: [{ id: 12, nombre: 'Tontódromo' }],
      completo: true,
    })
  })
})
