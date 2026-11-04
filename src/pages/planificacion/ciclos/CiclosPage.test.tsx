// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Programacion } from '@/types/planificacion'
import CiclosPage from './CiclosPage'

const base: Programacion = {
  id: 1,
  tipo_servicio_id: 1,
  servicio: 'Corte de césped',
  proveedor_id: 4,
  proveedor: 'Servicios Verdes Demo S.A.C.',
  estacion: 'Primavera',
  fecha_inicio_prevista: '2026-11-16',
  fecha_fin_prevista: '2026-11-19',
  estado: 'EnCurso',
  fecha_inicio_real: '2026-11-16',
  fecha_fin_real: null,
}
vi.mock('@/services/api/planificacion', () => ({
  listarProgramaciones: async () => [
    base,
    { ...base, id: 2, servicio: 'Control fitosanitario', proveedor: null, estado: 'Programada', fecha_inicio_real: null, fecha_inicio_prevista: '2026-11-30', fecha_fin_prevista: '2026-11-30' },
  ],
}))
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))
vi.mock('@/sesion/ContextoSesion', () => ({ useRolTercerizados: () => 'Jefe de sección' }))

afterEach(cleanup)

describe('CiclosPage', () => {
  it('lista los ciclos con contador por pestaña y filtra al cambiar de pestaña', async () => {
    render(
      <MemoryRouter>
        <CiclosPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Control fitosanitario')).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Todos 2' })).toBeTruthy()
    expect(within(screen.getByRole('table')).getByText('Personal propio')).toBeTruthy()

    await userEvent.setup().click(screen.getByRole('tab', { name: 'En curso 1' }))
    expect(screen.queryByText('Control fitosanitario')).toBeNull()
    expect(screen.getByText('Corte de césped')).toBeTruthy()
  })
})
