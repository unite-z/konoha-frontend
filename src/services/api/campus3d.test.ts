import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from './cliente'
import { obtenerCampus3d } from './campus3d'

afterEach(() => vi.unstubAllGlobals())

describe('obtenerCampus3d (AV-424)', () => {
  it('pide /datos/campus-3d.json y devuelve el JSON tipado', async () => {
    const cuerpo = { atribucion: '© OpenStreetMap contributors · OpenFreeMap', areas: [] }
    const peticion = vi.fn().mockResolvedValue(new Response(JSON.stringify(cuerpo), { status: 200 }))
    vi.stubGlobal('fetch', peticion)

    const datos = await obtenerCampus3d()

    expect(String(peticion.mock.calls[0][0])).toBe('/datos/campus-3d.json')
    expect(datos.atribucion).toContain('OpenFreeMap')
  })

  it('lanza ErrorApi si el servidor falla o no hay conexión', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })))
    await expect(obtenerCampus3d()).rejects.toBeInstanceOf(ErrorApi)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('red')))
    await expect(obtenerCampus3d()).rejects.toMatchObject({ estado: 0 })
  })
})
