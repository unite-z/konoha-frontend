// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { incidenciasSimuladas } from '@/services/simulados/incidencias'
import MisIncidenciasPage from './MisIncidenciasPage'
import { anadirPendiente, vaciarPendientes } from './reportesPendientes'

const propias = incidenciasSimuladas().filter((i) => [34, 37].includes(i.id))
vi.mock('@/services/api/incidencias', () => ({ listarMisIncidencias: async () => propias }))
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))

afterEach(() => {
  cleanup()
  vaciarPendientes()
})

function pintar() {
  render(
    <MemoryRouter>
      <MisIncidenciasPage />
    </MemoryRouter>,
  )
}

describe('MisIncidenciasPage', () => {
  it('lista las incidencias propias con su estado (Figma 391-8522)', async () => {
    pintar()
    expect(await screen.findByText('Árbol inclinado')).toBeTruthy()
    expect(screen.getByText('Derivada · tercerizada')).toBeTruthy()
    expect(screen.getByText('Cerrada')).toBeTruthy()
    expect(screen.getAllByRole('link', { name: /Reportar incidencia/ }).length).toBeGreaterThan(0)
  })

  it('sin conexión avisa y muestra arriba las pendientes de enviar (Figma 394-9964)', async () => {
    const enLinea = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    anadirPendiente({ clave: 'c1', tipo: 'Rama caída', espacio: 'Estacionamiento 3', creado_en: new Date().toISOString() })
    pintar()
    expect(await screen.findByText('Sin conexión · se enviará al reconectar')).toBeTruthy()
    expect(screen.getByText('Pendiente de enviar')).toBeTruthy()
    expect(screen.getByText('Estacionamiento 3 · ahora')).toBeTruthy()
    act(() => vaciarPendientes())
    expect(screen.queryByText('Pendiente de enviar')).toBeNull()
    enLinea.mockRestore()
  })
})
