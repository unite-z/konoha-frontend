// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ConfiguracionPage from './ConfiguracionPage'

vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))
vi.mock('@/sesion/ContextoSesion', () => ({ usePermisos: () => [] }))
const api = vi.hoisted(() => ({ guardarAparienciaCuenta: vi.fn() }))
vi.mock('@/services/api/core', () => api)

const datos = new Map<string, string>()

beforeEach(() => {
  datos.clear()
  api.guardarAparienciaCuenta.mockReset().mockImplementation(async (a: unknown) => a)
  vi.stubGlobal('localStorage', {
    getItem: (clave: string) => datos.get(clave) ?? null,
    setItem: (clave: string, valor: string) => void datos.set(clave, valor),
  })
  delete document.documentElement.dataset.tema
  delete document.documentElement.dataset.acento
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Configuración · Apariencia (AV-389)', () => {
  it('parte del tema claro y el azul institucional', () => {
    render(<ConfiguracionPage />)
    expect(screen.getByRole('heading', { name: 'Apariencia' })).toBeTruthy()
    expect((screen.getByRole('radio', { name: 'Claro' }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByRole('radio', { name: /Azul institucional/ }) as HTMLInputElement).checked).toBe(true)
  })

  it('al elegir, lo aplica al instante y lo recuerda', async () => {
    const usuario = userEvent.setup()
    render(<ConfiguracionPage />)

    await usuario.click(screen.getByRole('radio', { name: 'Oscuro' }))
    await usuario.click(screen.getByRole('radio', { name: /Verde PUCP/ }))

    expect(document.documentElement.dataset.tema).toBe('oscuro')
    expect(document.documentElement.dataset.acento).toBe('verde')
    expect(JSON.parse(datos.get('av:apariencia') ?? '{}')).toEqual({ tema: 'oscuro', acento: 'verde' })
    // También se guarda en la cuenta (AV-391).
    expect(api.guardarAparienciaCuenta).toHaveBeenLastCalledWith({ tema: 'oscuro', acento: 'verde' })
  })

  it('si no se puede guardar en la cuenta, avisa y la deja aplicada en el navegador', async () => {
    api.guardarAparienciaCuenta.mockRejectedValue(new Error('sin red'))
    const usuario = userEvent.setup()
    render(<ConfiguracionPage />)

    await usuario.click(screen.getByRole('radio', { name: 'Oscuro' }))

    expect(await screen.findByText(/No pudimos guardarla en tu cuenta/)).toBeTruthy()
    expect(document.documentElement.dataset.tema).toBe('oscuro')
  })

  it('muestra lo que se eligió antes', () => {
    datos.set('av:apariencia', '{"tema":"sistema","acento":"morado"}')
    render(<ConfiguracionPage />)
    expect((screen.getByRole('radio', { name: 'Según el sistema' }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByRole('radio', { name: /Morado PUCP/ }) as HTMLInputElement).checked).toBe(true)
  })
})
