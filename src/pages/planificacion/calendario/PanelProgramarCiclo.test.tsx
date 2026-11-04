// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Restriccion, ServicioPeriodico } from '@/types/planificacion'
import PanelProgramarCiclo from './PanelProgramarCiclo'

const api = vi.hoisted(() => ({
  restricciones: [] as Restriccion[],
  propuesta: { estacion: 'Primavera', fecha_inicio: '2026-11-11', fecha_fin: '2026-11-14', conflictos: [], ventana_libre_inicio: '2026-11-16' as string | null },
  crear: vi.fn(async () => ({ id: 9, servicio: 'Corte de césped', fecha_inicio_prevista: '2026-11-11', fecha_fin_prevista: '2026-11-14' })),
  cancelar: vi.fn(async () => ({})),
  reprogramar: vi.fn(async () => ({ id: 5, servicio: 'Corte de césped', fecha_inicio_prevista: '2026-11-23', fecha_fin_prevista: '2026-11-25' })),
}))
vi.mock('@/services/api/planificacion', () => ({
  obtenerPropuesta: async () => api.propuesta,
  listarRestricciones: async () => api.restricciones,
  crearProgramacion: api.crear,
  cambiarEstadoCiclo: api.cancelar,
  reprogramarProgramacion: api.reprogramar,
}))
vi.mock('@/services/api/corte', () => ({
  obtenerRutaCorte: async () => ({
    zonas: [
      { zona: 'Ciencias', jardines: 16, en_ruta: true },
      { zona: 'Sociales', jardines: 11, en_ruta: true },
      { zona: 'Letras', jardines: 9, en_ruta: true },
      { zona: 'Ingeniería', jardines: 9, en_ruta: true },
      { zona: 'Estacionamientos', jardines: 6, en_ruta: false },
    ],
    fuera_de_frecuencia: { dias_desde_ultimo: 47, maximo_dias: 45 },
  }),
}))
vi.mock('@/services/api/tercerizados', () => ({
  listarProveedores: async () => ({ count: 1, next: null, previous: null, results: [] }),
  listarTodo: async () => ({ resultados: [{ id: 4, razon_social: 'Servicios Verdes Demo S.A.C.', activo: true }], completo: true }),
}))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false
  }
})
afterEach(() => {
  cleanup()
  api.crear.mockClear()
  api.cancelar.mockClear()
  api.reprogramar.mockClear()
})

const corte: ServicioPeriodico = {
  id: 1,
  nombre: 'Corte de césped',
  es_ruidoso: true,
  frecuencias: [],
  duracion: { duracion_maxima_dias: 3, dias_limpieza: 1, hora_inicio: null, hora_fin: null, fecha_modificacion: '2026-10-01T10:00:00-05:00', modificado_por: 'jefe' },
}

function restriccion(parcial: Partial<Restriccion>): Restriccion {
  return {
    id: 1,
    tipo_restriccion_id: 1,
    tipo: 'Jueves culturales',
    efecto: 'Advertencia',
    aplica_servicios_ruidosos: true,
    fecha_inicio: '2026-11-12',
    fecha_fin: '2026-11-12',
    hora_inicio: null,
    hora_fin: null,
    area_verde_id: null,
    descripcion: 'Sociales y Comedor Central',
    serie: null,
    ...parcial,
  }
}

describe('PanelProgramarCiclo', () => {
  it('entra con la propuesta y, con un aviso, exige justificación antes de programar con constancia', async () => {
    api.restricciones = [restriccion({})]
    const usuario = userEvent.setup()
    render(<PanelProgramarCiclo servicios={[corte]} servicioInicial={1} onCerrar={vi.fn()} onProgramada={vi.fn()} />)

    await waitFor(() => expect((screen.getByLabelText(/^Inicio/) as HTMLInputElement).value).toBe('2026-11-11'))
    expect(await screen.findByText('Fechas propuestas por el sistema')).toBeTruthy()
    expect(await screen.findByText(/Jueves culturales/)).toBeTruthy()
    await usuario.selectOptions(screen.getByLabelText(/^Proveedor/), '4')
    await usuario.click(screen.getByRole('button', { name: 'Programar con constancia' }))
    expect(api.crear).not.toHaveBeenCalled()
    expect(screen.getByText('Justifica por qué se programa en estas fechas.')).toBeTruthy()

    await usuario.type(screen.getByLabelText(/^Justificación/), 'Solo hay cuadrilla esa semana')
    await usuario.click(screen.getByRole('button', { name: 'Programar con constancia' }))
    expect(api.crear).toHaveBeenCalledWith({
      tipo_servicio_id: 1,
      proveedor_id: 4,
      fecha_inicio_prevista: '2026-11-11',
      fecha_fin_prevista: '2026-11-14',
      justificacion: 'Solo hay cuadrilla esa semana',
      ventana_mes: '2026-11',
      zonas: ['Ciencias', 'Sociales', 'Letras', 'Ingeniería'],
    })
  })

  it('con un tercerizado pide la ventana y avisa bajo «Fin» si el periodo pasa del máximo', async () => {
    api.restricciones = []
    const usuario = userEvent.setup()
    render(<PanelProgramarCiclo servicios={[corte]} servicioInicial={1} onCerrar={vi.fn()} onProgramada={vi.fn()} />)

    await waitFor(() => expect((screen.getByLabelText(/^Inicio/) as HTMLInputElement).value).toBe('2026-11-11'))
    expect(screen.queryByLabelText(/^Ventana/)).toBeNull()
    await usuario.selectOptions(screen.getByLabelText(/^Proveedor/), '4')
    expect((screen.getByLabelText(/^Ventana/) as HTMLSelectElement).value).toBe('2026-11')

    const fin = screen.getByLabelText(/^Fin/)
    await usuario.clear(fin)
    await usuario.type(fin, '2026-11-15')
    expect(screen.getByText('5 días: máximo 3 + 1 de limpieza')).toBeTruthy()
    expect(screen.getByText('5 días seleccionados')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Programar ciclo' }).getAttribute('aria-disabled')).toBe('true')
  })

  it('con una prohibición no deja programar y «Usar» aplica la ventana libre', async () => {
    api.restricciones = [restriccion({ id: 2, tipo: 'Examen de admisión', efecto: 'Prohibicion', fecha_inicio: '2026-11-13', fecha_fin: '2026-11-13' })]
    const usuario = userEvent.setup()
    render(<PanelProgramarCiclo servicios={[corte]} servicioInicial={1} onCerrar={vi.fn()} onProgramada={vi.fn()} />)

    expect(await screen.findByText(/No se puede programar el/)).toBeTruthy()
    await usuario.selectOptions(screen.getByLabelText(/^Proveedor/), 'propio')
    await usuario.click(screen.getByRole('button', { name: 'Programar ciclo' }))
    expect(api.crear).not.toHaveBeenCalled()

    await usuario.click(screen.getByRole('button', { name: 'Usar' }))
    expect((screen.getByLabelText(/^Inicio/) as HTMLInputElement).value).toBe('2026-11-16')
    expect((screen.getByLabelText(/^Fin/) as HTMLInputElement).value).toBe('2026-11-19')
  })

  it('al reprogramar entra con las fechas del ciclo y solo las cambia (AV-362)', async () => {
    const onProgramada = vi.fn()
    const ciclo = {
      id: 5,
      tipo_servicio_id: 1,
      servicio: 'Corte de césped',
      proveedor_id: 4,
      proveedor: 'Servicios Verdes Demo S.A.C.',
      estacion: 'Primavera' as const,
      fecha_inicio_prevista: '2026-11-16',
      fecha_fin_prevista: '2026-11-18',
      estado: 'Programada' as const,
      fecha_inicio_real: null,
      fecha_fin_real: null,
    }
    render(<PanelProgramarCiclo servicios={[corte]} servicioInicial={null} reprogramar={ciclo} onCerrar={vi.fn()} onProgramada={onProgramada} />)
    expect(screen.getByRole('dialog', { name: 'Reprogramar ciclo' })).toBeTruthy()
    await waitFor(() => expect((screen.getByLabelText(/^Inicio/) as HTMLInputElement).value).toBe('2026-11-16'))

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Reprogramar' }))
    await waitFor(() => expect(api.reprogramar).toHaveBeenCalledWith(5, expect.objectContaining({ fecha_inicio_prevista: '2026-11-16', fecha_fin_prevista: '2026-11-18' })))
    expect(api.crear).not.toHaveBeenCalled()
    expect(api.cancelar).not.toHaveBeenCalled()
    expect(onProgramada).toHaveBeenCalled()
  })

  it('en el corte tiene el paso «Ruta», avisa de que va fuera de frecuencia y deja ajustar las zonas (Figma 372-5523)', async () => {
    api.restricciones = []
    const usuario = userEvent.setup()
    render(
      <MemoryRouter>
        <PanelProgramarCiclo servicios={[corte]} servicioInicial={1} onCerrar={vi.fn()} onProgramada={vi.fn()} />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Fuera de frecuencia')).toBeTruthy()
    await usuario.click(screen.getByRole('tab', { name: '2 · Ruta' }))
    expect(screen.getByText('Han pasado 47 días desde el último ciclo (máximo 45).')).toBeTruthy()
    expect(screen.getByText('Ruta de jardines · 45')).toBeTruthy()
    expect(screen.getByText('Fuera de esta ruta')).toBeTruthy()
    await usuario.click(screen.getByRole('checkbox', { name: 'Sociales' }))
    expect(screen.getByText('Ruta de jardines · 34')).toBeTruthy()
  })
})
