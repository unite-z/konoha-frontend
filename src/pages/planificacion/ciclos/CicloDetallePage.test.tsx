// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Programacion } from '@/types/planificacion'
import CicloDetallePage from './CicloDetallePage'

const programada: Programacion = {
  id: 7,
  tipo_servicio_id: 2,
  servicio: 'Control fitosanitario',
  proveedor_id: null,
  proveedor: null,
  estacion: 'Primavera',
  fecha_inicio_prevista: '2026-11-02',
  fecha_fin_prevista: '2026-11-03',
  estado: 'Programada',
  fecha_inicio_real: null,
  fecha_fin_real: null,
}
const cambiarEstadoCiclo = vi.fn(async (_id: number, _cambio: string, fecha?: string) => ({ ...programada, estado: 'EnCurso', fecha_inicio_real: fecha ?? null }))
vi.mock('@/services/api/planificacion', () => ({
  listarProgramaciones: async () => [programada],
  listarServiciosPeriodicos: async () => [],
  listarRestricciones: async () => [
    { id: 3, tipo_restriccion_id: 1, tipo: 'Ceremonia', efecto: 'Advertencia', aplica_servicios_ruidosos: false, fecha_inicio: '2026-11-03', fecha_fin: '2026-11-03', hora_inicio: null, hora_fin: null, area_verde_id: null, descripcion: 'Graduación', serie: null },
  ],
  cambiarEstadoCiclo: (id: number, cambio: string, fecha?: string) => cambiarEstadoCiclo(id, cambio, fecha),
}))
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))
vi.mock('@/sesion/ContextoSesion', () => ({ useRolTercerizados: () => 'Jefe de sección' }))
vi.mock('@/utils/instanteLima', () => ({ hoyLima: () => '2026-11-02' }))
vi.mock('@/layouts/LayoutOficina/AccionesPagina', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    this.open = false
  }
})
afterEach(cleanup)

function pintar(id: string) {
  render(
    <MemoryRouter initialEntries={[`/planificacion/ciclos/${id}`]}>
      <Routes>
        <Route path="/planificacion/ciclos/:id" element={<CicloDetallePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CicloDetallePage', () => {
  it('muestra el ciclo con sus restricciones e inicia con la fecha real', async () => {
    pintar('7')
    expect(await screen.findByRole('heading', { name: 'Control fitosanitario' })).toBeTruthy()
    expect(await screen.findByText('Graduación')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Cancelar ciclo' })).toBeTruthy()

    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Iniciar ciclo' }))
    expect((screen.getByLabelText(/Fecha de inicio real/) as HTMLInputElement).value).toBe('2026-11-02')
    await usuario.click(screen.getAllByRole('button', { name: 'Iniciar ciclo' }).at(-1) as HTMLElement)

    expect(cambiarEstadoCiclo).toHaveBeenCalledWith(7, 'inicio', '2026-11-02')
    expect(await screen.findByRole('button', { name: 'Finalizar ciclo' })).toBeTruthy()
  })

  it('avisa si el ciclo no existe', async () => {
    pintar('99')
    expect(await screen.findByText('No existe este ciclo')).toBeTruthy()
  })
})
