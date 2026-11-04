// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { incidenciasSimuladas } from '@/services/simulados/incidencias'
import BandejaIncidenciasPage from './BandejaIncidenciasPage'

const datos = incidenciasSimuladas()
vi.mock('@/services/api/incidencias', () => ({ listarIncidencias: async () => datos }))
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))

afterEach(cleanup)

describe('BandejaIncidenciasPage', () => {
  it('muestra las incidencias con su severidad y vía, y filtra por pestaña', async () => {
    render(
      <MemoryRouter>
        <BandejaIncidenciasPage />
      </MemoryRouter>,
    )
    const tabla = await screen.findByRole('table')
    expect(within(tabla).getByText('INC-2026-041')).toBeTruthy()
    expect(within(tabla).getAllByText('Sin clasificar').length).toBeGreaterThan(0)
    expect(within(tabla).getByText('31 h')).toBeTruthy()

    await userEvent.setup().click(screen.getByRole('tab', { name: 'Cerradas 2' }))
    expect(within(screen.getByRole('table')).queryByText('INC-2026-041')).toBeNull()
    expect(within(screen.getByRole('table')).getByText('Descartada')).toBeTruthy()
  })
})
