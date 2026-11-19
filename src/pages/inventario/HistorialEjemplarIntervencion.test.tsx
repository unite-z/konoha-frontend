// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HistorialEjemplar from './HistorialEjemplar'

vi.mock('@/services/api/ejemplares', () => ({
  listarHistorialEjemplar: vi.fn(async (_id: number, fuente: string) =>
    fuente === 'podas'
      ? [
          {
            id: 41,
            fecha: '2026-11-12',
            tipo: 'Poda mayor de campaña',
            origen: 'Inventario',
            entidad: 'intervencion',
          },
        ]
      : [],
  ),
}))

afterEach(cleanup)

describe('HistorialEjemplar', () => {
  it('la poda del inventario enlaza a su ficha para completarla', async () => {
    render(
      <MemoryRouter>
        <HistorialEjemplar ejemplarId={3} />
      </MemoryRouter>,
    )

    const enlace = await screen.findByRole('link', { name: 'Ver la intervención' })
    expect(enlace.getAttribute('href')).toBe('/areas-verdes/intervenciones-poda/41')
  })
})
