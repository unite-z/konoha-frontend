// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { comprimirFotografia } from './comprimirFotografia'

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('reduce el lado mayor y convierte la foto a JPEG', async () => {
  const cerrar = vi.fn()
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 3200, height: 1600, close: cerrar })))
  const dibujar = vi.fn()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: dibujar } as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback?.(new Blob(['foto'], { type: 'image/jpeg' })))
  const resultado = await comprimirFotografia(new File(['original'], 'jardin.png', { type: 'image/png' }))
  expect(resultado.name).toBe('jardin.jpg')
  expect(resultado.type).toBe('image/jpeg')
  expect(dibujar).toHaveBeenCalledWith(expect.anything(), 0, 0, 1600, 800)
  expect(cerrar).toHaveBeenCalledOnce()
})
