import { afterEach, describe, expect, it, vi } from 'vitest'
import { obtenerResumenSectores } from './resumenSectores'

afterEach(() => vi.unstubAllGlobals())

describe('obtenerResumenSectores (AV-433)', () => {
  it('hace un GET con el ciclo y sin cuerpo', async () => {
    const peticion = vi.fn().mockResolvedValue(new Response(JSON.stringify({ sectores: [] }), { status: 200 }))
    vi.stubGlobal('fetch', peticion)
    await obtenerResumenSectores(7)
    const [url, opciones] = peticion.mock.calls[0]
    expect(url).toBe('/api/v1/planificacion/resumen-sectores/?ciclo_id=7')
    expect(opciones.method).toBe('GET')
  })

  it('sin ciclo no envía el parámetro', async () => {
    const peticion = vi.fn().mockResolvedValue(new Response(JSON.stringify({ sectores: [] }), { status: 200 }))
    vi.stubGlobal('fetch', peticion)
    await obtenerResumenSectores(null)
    expect(peticion.mock.calls[0][0]).toBe('/api/v1/planificacion/resumen-sectores/')
  })
})
