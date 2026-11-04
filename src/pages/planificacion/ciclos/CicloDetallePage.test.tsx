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
const cambiarEstadoCiclo = vi.fn(async (_id: number, cambio: string, fecha?: string, _motivo?: string) =>
  cambio === 'cancelacion' ? { ...programada, estado: 'Cancelada' } : { ...programada, estado: 'EnCurso', fecha_inicio_real: fecha ?? null },
)
const historial: { estado: 'Programada' | 'EnCurso'; fecha_hora: string; autor: string }[] = []
vi.mock('@/services/api/planificacion', () => ({
  listarProgramaciones: async () => [
    programada,
    { ...programada, id: 8, estado: 'EnCurso', fecha_inicio_real: '2026-11-02', historial },
    { ...programada, id: 9, servicio: 'Corte de césped', estado: 'EnCurso', fecha_inicio_prevista: '2026-11-01', fecha_fin_prevista: '2026-11-04', fecha_inicio_real: '2026-11-01' },
  ],
  listarServiciosPeriodicos: async () => [],
  listarRestricciones: async () => [
    { id: 3, tipo_restriccion_id: 1, tipo: 'Ceremonia', efecto: 'Advertencia', aplica_servicios_ruidosos: false, fecha_inicio: '2026-11-03', fecha_fin: '2026-11-03', hora_inicio: null, hora_fin: null, area_verde_id: null, descripcion: 'Graduación', serie: null },
  ],
  cambiarEstadoCiclo: (id: number, cambio: string, fecha?: string, motivo?: string) => cambiarEstadoCiclo(id, cambio, fecha, motivo),
}))
vi.mock('@/services/api/corte', async () => {
  const { cicloCorteSimulado } = await import('@/services/simulados/corte')
  return { obtenerCicloCorte: async (ciclo: Programacion) => cicloCorteSimulado(ciclo) }
})
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))
vi.mock('@/sesion/ContextoSesion', () => ({ useRolTercerizados: () => 'Jefe de sección' }))
vi.mock('@/utils/instanteLima', async (original) => ({ ...(await original<typeof import('@/utils/instanteLima')>()), hoyLima: () => '2026-11-02' }))
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
    expect(await screen.findByText('Programada')).toBeTruthy()
    // Como en Figma 370-3811: fechas previstas sin iniciar y el aviso del periodo en «Restricciones».
    expect(screen.getByText('02 al 03/11')).toBeTruthy()
    expect(await screen.findByText('1 aviso')).toBeTruthy()
    expect(screen.getByText('Mar 03 · con constancia')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Cancelar ciclo' })).toBeTruthy()

    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Iniciar ciclo' }))
    expect((screen.getByLabelText(/Fecha de inicio real/) as HTMLInputElement).value).toBe('2026-11-02')
    await usuario.click(screen.getAllByRole('button', { name: 'Iniciar ciclo' }).at(-1) as HTMLElement)

    expect(cambiarEstadoCiclo).toHaveBeenCalledWith(7, 'inicio', '2026-11-02', undefined)
    expect(await screen.findByRole('button', { name: 'Finalizar ciclo' })).toBeTruthy()
  })

  it('cancela solo con motivo (AV-253, Figma 370-4167)', async () => {
    pintar('7')
    const usuario = userEvent.setup()
    await usuario.click(await screen.findByRole('button', { name: 'Cancelar ciclo' }))
    expect(screen.getByRole('dialog', { name: 'Cancelar Control fitosanitario' })).toBeTruthy()
    expect(screen.getByText('El ciclo queda cancelado y se mantiene en el historial.')).toBeTruthy()

    const confirmar = () => screen.getAllByRole('button', { name: 'Cancelar ciclo' }).at(-1) as HTMLElement
    await usuario.click(confirmar())
    expect(screen.getByText('Escribe el motivo de la cancelación.')).toBeTruthy()
    expect(cambiarEstadoCiclo).not.toHaveBeenCalledWith(7, 'cancelacion', undefined, expect.anything())

    await usuario.type(screen.getByLabelText(/^Motivo/), 'El proveedor no tiene cuadrilla esa semana.')
    await usuario.click(confirmar())
    expect(cambiarEstadoCiclo).toHaveBeenCalledWith(7, 'cancelacion', undefined, 'El proveedor no tiene cuadrilla esa semana.')
  })

  it('con historial lo lista del más reciente al más antiguo (AV-253)', async () => {
    historial.push(
      { estado: 'Programada', fecha_hora: '2026-10-19T09:30:00-05:00', autor: 'Robert G.' },
      { estado: 'EnCurso', fecha_hora: '2026-11-02T06:10:00-05:00', autor: 'Robert G.' },
    )
    pintar('8')
    const eventos = await screen.findAllByRole('listitem')
    expect(eventos.map((e) => e.textContent)).toEqual(['Iniciado02/11 06:10 · Robert G.', 'Programado19/10 09:30 · Robert G.'])
    expect(screen.getByText('Inicio real')).toBeTruthy()
  })

  it('un corte en curso muestra avance, duración, interrupciones y la ruta, y recuerda la limpieza (AV-270)', async () => {
    pintar('9')
    expect(await screen.findByText('62 %')).toBeTruthy()
    expect(screen.getByText('28 de 45 jardines')).toBeTruthy()
    expect(screen.getByText('Día 2 de 4')).toBeTruthy()
    expect(screen.getByText('Sociales → Ciencias')).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Ruta 45' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText('Limpieza: al completar la ruta')).toBeTruthy()
    expect(screen.getByText('+14 más')).toBeTruthy()
    expect(screen.getByText('Detenido por interrupción')).toBeTruthy()

    await userEvent.setup().click(screen.getByRole('tab', { name: 'Interrupciones 1' }))
    expect(screen.getByText('Ruido durante clases en las aulas Z201 a Z205.')).toBeTruthy()
  })

  it('avisa si el ciclo no existe', async () => {
    pintar('99')
    expect(await screen.findByText('No existe este ciclo')).toBeTruthy()
  })
})
