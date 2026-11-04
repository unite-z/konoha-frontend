// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import { incidenciaSimulada } from '@/services/simulados/incidencias'
import IncidenciaDetallePage from './IncidenciaDetallePage'

vi.mock('@/services/api/incidencias', () => ({
  obtenerIncidencia: async (id: number) => {
    const incidencia = incidenciaSimulada(id)
    if (!incidencia) throw new ErrorApi(404, 'no-encontrado', 'No se encontró el registro solicitado')
    return incidencia
  },
}))
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))

afterEach(cleanup)

function pintar(id: string) {
  render(
    <MemoryRouter initialEntries={[`/incidencias/${id}`]}>
      <Routes>
        <Route path="/incidencias/:id" element={<IncidenciaDetallePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('IncidenciaDetallePage', () => {
  it('muestra la ficha con ubicación, ejemplar, descripción y quién la reportó (Figma 388-7305)', async () => {
    pintar('41')
    expect(await screen.findByText('Jardín de la Biblioteca · Ciencias')).toBeTruthy()
    expect(screen.getByText('T-0412 · Ficus · 7 m')).toBeTruthy()
    expect(screen.getByText('Rama grande caída sobre el paso peatonal.')).toBeTruthy()
    expect(screen.getByText(/^Ana Q\. · app móvil · /)).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Sin foto' })).toBeTruthy()
  })

  it('avisa si la incidencia no existe', async () => {
    pintar('999')
    expect(await screen.findByText('No existe esta incidencia')).toBeTruthy()
  })
})
