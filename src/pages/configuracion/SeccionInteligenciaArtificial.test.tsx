// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ConfiguracionIa } from '@/types/ia'
import SeccionInteligenciaArtificial from './SeccionInteligenciaArtificial'

const api = vi.hoisted(() => ({
  obtenerConfiguracionIa: vi.fn(),
  cambiarConfiguracionIa: vi.fn(),
  probarConexionIa: vi.fn(),
}))
vi.mock('@/services/api/configuracionIa', () => api)

const BASE: ConfiguracionIa = {
  proveedor: 'deepseek',
  modelo: 'deepseek-flash',
  origen: 'entorno',
  proveedores: [
    {
      id: 'gemini',
      nombre: 'Gemini (Google AI Studio)',
      modelos: ['gemini-3.6-flash', 'gemini-3.5-flash'],
      clave_configurada: true,
    },
    { id: 'deepseek', nombre: 'DeepSeek', modelos: ['deepseek-flash', 'deepseek-v4-pro'], clave_configurada: true },
  ],
}

beforeEach(() => {
  api.obtenerConfiguracionIa.mockReset().mockResolvedValue(BASE)
  api.cambiarConfiguracionIa.mockReset()
  api.probarConexionIa.mockReset()
})

afterEach(cleanup)

describe('Configuración · Inteligencia artificial (AV-395)', () => {
  it('muestra el proveedor activo y guarda el cambio de proveedor y modelo', async () => {
    api.cambiarConfiguracionIa.mockResolvedValue({
      ...BASE,
      proveedor: 'gemini',
      modelo: 'gemini-3.6-flash',
      origen: 'configuracion',
    })
    render(<SeccionInteligenciaArtificial />)
    expect(await screen.findByText('Ahora: DeepSeek · deepseek-flash (el del servidor)')).toBeTruthy()
    const guardar = screen.getByRole('button', { name: 'Guardar' })
    expect(guardar.getAttribute('aria-disabled')).toBe('true')

    await userEvent.setup().click(screen.getByRole('radio', { name: 'Gemini (Google AI Studio)' }))
    await userEvent.setup().click(screen.getByRole('button', { name: 'Guardar' }))
    expect(api.cambiarConfiguracionIa).toHaveBeenCalledWith({ proveedor: 'gemini', modelo: 'gemini-3.6-flash' })
    expect(await screen.findByText('Ahora: Gemini (Google AI Studio) · gemini-3.6-flash (elegido aquí)')).toBeTruthy()
  })

  it('«Probar conexión» dice si responde y cuánto tarda, o por qué no', async () => {
    api.probarConexionIa
      .mockResolvedValueOnce({ ok: true, proveedor: 'deepseek', modelo: 'deepseek-flash', duracion_ms: 1240 })
      .mockResolvedValueOnce({
        ok: false,
        proveedor: 'deepseek',
        modelo: 'deepseek-flash',
        duracion_ms: 30,
        detalle: 'El análisis con IA no está configurado',
      })
    render(<SeccionInteligenciaArtificial />)
    const probar = await screen.findByRole('button', { name: 'Probar conexión' })
    await userEvent.setup().click(probar)
    expect(await screen.findByText('Responde en 1,2 s')).toBeTruthy()
    await userEvent.setup().click(probar)
    expect(await screen.findByText('No responde')).toBeTruthy()
    expect(screen.getByText('El análisis con IA no está configurado')).toBeTruthy()
  })

  it('avisa del modelo que no analiza fotos', async () => {
    render(<SeccionInteligenciaArtificial />)
    expect(await screen.findByRole('option', { name: 'deepseek-v4-pro (no analiza fotos)' })).toBeTruthy()
  })
})
