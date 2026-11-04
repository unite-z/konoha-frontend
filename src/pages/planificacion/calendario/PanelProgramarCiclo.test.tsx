// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Restriccion, ServicioPeriodico } from '@/types/planificacion'
import PanelProgramarCiclo from './PanelProgramarCiclo'

const api = vi.hoisted(() => ({
  restricciones: [] as Restriccion[],
  propuesta: { estacion: 'Primavera', fecha_inicio: '2026-11-11', fecha_fin: '2026-11-14', conflictos: [], ventana_libre_inicio: '2026-11-16' as string | null },
  crear: vi.fn(async () => ({ id: 9, servicio: 'Corte de césped', fecha_inicio_prevista: '2026-11-11', fecha_fin_prevista: '2026-11-14' })),
}))
vi.mock('@/services/api/planificacion', () => ({
  obtenerPropuesta: async () => api.propuesta,
  listarRestricciones: async () => api.restricciones,
  crearProgramacion: api.crear,
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
    })
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
})
