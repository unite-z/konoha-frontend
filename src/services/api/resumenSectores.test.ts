import { afterEach, describe, expect, it, vi } from 'vitest'
import { obtenerResumenSectores } from './resumenSectores'

afterEach(() => vi.unstubAllGlobals())

function respuestaVacia() {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify({ sectores: [] }), { status: 200 }))
}

describe('obtenerResumenSectores (AV-433)', () => {
  it('hace un GET con el ciclo y sin cuerpo', async () => {
    const peticion = respuestaVacia()
    vi.stubGlobal('fetch', peticion)
    await obtenerResumenSectores({ cicloId: 7 })
    const [url, opciones] = peticion.mock.calls[0]
    expect(url).toBe('/api/v1/planificacion/resumen-sectores/?ciclo_id=7')
    expect(opciones.method).toBe('GET')
  })

  it('con un periodo envía «desde» y «hasta»', async () => {
    const peticion = respuestaVacia()
    vi.stubGlobal('fetch', peticion)
    await obtenerResumenSectores({ desde: '2026-11-16', hasta: '2026-11-19' })
    expect(peticion.mock.calls[0][0]).toBe('/api/v1/planificacion/resumen-sectores/?desde=2026-11-16&hasta=2026-11-19')
  })

  it('sin filtros no envía parámetros', async () => {
    const peticion = respuestaVacia()
    vi.stubGlobal('fetch', peticion)
    await obtenerResumenSectores({})
    expect(peticion.mock.calls[0][0]).toBe('/api/v1/planificacion/resumen-sectores/')
  })
})
