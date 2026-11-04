// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
  listarCapatacesDisponibles: async () => [],
  listarActividadesEncargo: async () => [],
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

  it('derivada a tercerizado muestra el avance del requerimiento (Figma 394-9194)', async () => {
    pintar('37')
    expect(await screen.findByRole('heading', { name: 'Requerimiento REQ-2026-044' })).toBeTruthy()
    expect(screen.getByText('Podas Altura Demo E.I.R.L. · extraordinaria')).toBeTruthy()
    expect(screen.getByText(/Informe del proveedor/).textContent).toContain('en curso')
    expect(screen.getByText(/^Conformidad/).textContent).toContain('pendiente')
  })

  it('con el encargo cancelado avisa del motivo y deja derivar de nuevo (Figma 390-8582)', async () => {
    pintar('32')
    expect(await screen.findByText('Se canceló el encargo ENC-2026-118')).toBeTruthy()
    expect(screen.getByText('Motivo: la cuadrilla B no tiene escalera.')).toBeTruthy()
    await userEvent.setup().click(screen.getByRole('radio', { name: 'Encargo a un capataz' }))
    expect(screen.getByRole('heading', { name: 'Encargo a un capataz' })).toBeTruthy()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Volver' }))
    expect(screen.getByRole('heading', { name: 'Derivar de nuevo' })).toBeTruthy()
  })
})
