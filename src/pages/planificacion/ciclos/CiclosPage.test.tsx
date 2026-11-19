// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
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
    { ...base, codigo: 'CC-2026-11' },
    {
      ...base,
      id: 2,
      servicio: 'Control fitosanitario',
      proveedor: null,
      estado: 'Programada',
      fecha_inicio_real: null,
      fecha_inicio_prevista: '2026-11-30',
      fecha_fin_prevista: '2026-11-30',
    },
    {
      ...base,
      id: 3,
      servicio: 'Poda mayor programada',
      codigo: 'PM-2026-01',
      estado: 'EnCurso',
      fecha_inicio_prevista: '2026-11-02',
      fecha_fin_prevista: '2026-11-05',
      fecha_inicio_real: '2026-11-02',
    },
  ],
  cambiarEstadoCiclo: async () => base,
  listarServiciosPeriodicos: async () => [],
}))
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))
vi.mock('@/sesion/ContextoSesion', () => ({
  usePermisos: () => ['PLA.PLANIFICACION.GESTIONAR', 'PLA.PLANIFICACION.CONSULTAR'],
}))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    this.open = false
  }
})
afterEach(cleanup)

function pintarConDetalle() {
  render(
    <MemoryRouter initialEntries={['/planificacion/ciclos']}>
      <Routes>
        <Route path="/planificacion/ciclos" element={<CiclosPage />} />
        <Route path="/planificacion/ciclos/:id" element={<p>Detalle del ciclo</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CiclosPage', () => {
  it('acciones por estado sin entrar al detalle; el corte en curso se cierra en su ficha (AV-400)', async () => {
    pintarConDetalle()
    expect(await screen.findByRole('button', { name: 'Reprogramar Control fitosanitario' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Iniciar Control fitosanitario' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Finalizar PM-2026-01' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Finalizar CC-2026-11' })).toBeNull()

    await userEvent.setup().click(screen.getByRole('button', { name: 'Cancelar Control fitosanitario' }))
    expect(screen.getByRole('dialog', { name: 'Cancelar Control fitosanitario' })).toBeTruthy()
    expect(screen.queryByText('Detalle del ciclo')).toBeNull()
  })

  it('lista los ciclos con contador por pestaña y filtra al cambiar de pestaña', async () => {
    render(
      <MemoryRouter>
        <CiclosPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Control fitosanitario')).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Todos 3' })).toBeTruthy()
    expect(within(screen.getByRole('table')).getByText('Personal propio')).toBeTruthy()
    // Como en Figma 346-1032: código del ciclo bajo el servicio (AV-364) y fechas «16/11 al 19/11».
    expect(screen.getByText('CC-2026-11')).toBeTruthy()
    expect(screen.getByText('16/11 al 19/11')).toBeTruthy()
    expect(screen.getByText('30/11')).toBeTruthy()

    await userEvent.setup().click(screen.getByRole('tab', { name: 'En curso 2' }))
    expect(screen.queryByText('Control fitosanitario')).toBeNull()
    expect(screen.getByText('Corte de césped')).toBeTruthy()
  })

  it('muestra el aviso que deja «Programar ciclo» al atender una alerta (Figma 373-5779)', async () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/planificacion/ciclos',
            state: { aviso: { mensaje: 'Ciclo programado', detalle: 'Corte de césped: alerta atendida.' } },
          },
        ]}
      >
        <CiclosPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Ciclo programado')).toBeTruthy()
    expect(screen.getByText('Corte de césped: alerta atendida.')).toBeTruthy()
  })
})
