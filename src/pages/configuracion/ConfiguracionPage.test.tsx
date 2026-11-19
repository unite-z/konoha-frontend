// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ConfiguracionPage from './ConfiguracionPage'

vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))
const sesion = vi.hoisted(() => ({ permisos: [] as string[] }))
vi.mock('@/sesion/ContextoSesion', () => ({ usePermisos: () => sesion.permisos }))

afterEach(cleanup)

function pintar() {
  render(
    <MemoryRouter>
      <ConfiguracionPage />
    </MemoryRouter>,
  )
}

describe('Configuración · panel de módulos (AV-397)', () => {
  it('sin el permiso de IA solo ofrece Apariencia', () => {
    sesion.permisos = []
    pintar()
    expect(screen.getByRole('link', { name: /Apariencia/ }).getAttribute('href')).toBe('/configuracion/apariencia')
    expect(screen.queryByRole('link', { name: /Inteligencia artificial/ })).toBeNull()
  })

  it('quien gestiona la IA ve también sus dos módulos, cada uno con su pantalla', () => {
    sesion.permisos = ['IA.PROPUESTA.VALIDAR']
    pintar()
    expect(screen.getAllByRole('link')).toHaveLength(3)
    expect(screen.getByRole('link', { name: /Inteligencia artificial/ }).getAttribute('href')).toBe(
      '/configuracion/inteligencia-artificial',
    )
    expect(screen.getByRole('link', { name: /Uso y costes de la IA/ }).getAttribute('href')).toBe(
      '/configuracion/uso-ia',
    )
  })
})
