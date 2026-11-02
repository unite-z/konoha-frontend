import { afterEach, describe, expect, it, vi } from 'vitest'
import { listarExportaciones, listarTiposExportables } from './exportaciones'

vi.mock('../../config/datosSimulados', () => ({ DATOS_SIMULADOS: true }))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('exportaciones con datos simulados', () => {
  it('responde los tipos y el historial sin usar la red', async () => {
    const peticion = vi.fn()
    vi.stubGlobal('fetch', peticion)
    const [tipos, historial] = await Promise.all([listarTiposExportables(), listarExportaciones({})])
    expect(tipos.some((t) => t.tipo === 'GestionOSG')).toBe(true)
    expect(historial.count).toBe(8)
    expect(peticion).not.toHaveBeenCalled()
  })
})
