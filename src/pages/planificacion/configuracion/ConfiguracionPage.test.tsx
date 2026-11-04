// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { ServicioPeriodico } from '@/types/planificacion'
import ConfiguracionPage from './ConfiguracionPage'

const modificacion = { fecha_modificacion: '2026-10-28T09:12:00-05:00', modificado_por: 'Robert G.' }
const servicio: ServicioPeriodico = {
  id: 1,
  nombre: 'Corte de césped',
  es_ruidoso: true,
  frecuencias: [{ estacion: 'Primavera', frecuencia_teorica_dias: 21, frecuencia_practica_dias: 30, frecuencia_maxima_dias: 45, ...modificacion }],
  duracion: null,
}
const actualizarFrecuencia = vi.fn(async (_id: number, estacion: string, entrada: { frecuencia_teorica_dias: number }) => ({
  ...servicio,
  frecuencias: [...servicio.frecuencias, { estacion, frecuencia_teorica_dias: entrada.frecuencia_teorica_dias, frecuencia_practica_dias: null, frecuencia_maxima_dias: null, ...modificacion }],
}))
vi.mock('@/services/api/planificacion', () => ({
  listarServiciosPeriodicos: async () => [servicio],
  listarProgramaciones: async () => [],
  actualizarFrecuencia: (id: number, estacion: string, entrada: { frecuencia_teorica_dias: number }) => actualizarFrecuencia(id, estacion, entrada),
  actualizarDuracion: vi.fn(),
}))
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))
vi.mock('@/sesion/ContextoSesion', () => ({ useRolTercerizados: () => 'Jefe de sección' }))
vi.mock('@/utils/instanteLima', () => ({ hoyLima: () => '2026-11-04' }))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    this.open = false
  }
})
afterEach(cleanup)

describe('ConfiguracionPage', () => {
  it('lista los servicios y guarda en el panel solo las estaciones que cambian', async () => {
    render(
      <MemoryRouter>
        <ConfiguracionPage />
      </MemoryRouter>,
    )
    const tabla = await screen.findByRole('table')
    expect(within(tabla).getByText('Cada 30 días · máx. 45')).toBeTruthy()
    expect(within(tabla).getByText('Incompleto')).toBeTruthy()

    const usuario = userEvent.setup()
    await usuario.click(within(tabla).getByRole('button', { name: 'Configurar Corte de césped' }))
    const panel = screen.getByRole('dialog', { name: 'Corte de césped' })

    await usuario.clear(within(panel).getByLabelText(/Máxima/, { selector: '#frecuencia-Primavera-maxima' }))
    await usuario.type(within(panel).getByLabelText(/Máxima/, { selector: '#frecuencia-Primavera-maxima' }), '25')
    await usuario.click(within(panel).getByRole('button', { name: 'Guardar cambios' }))
    expect(within(panel).getByText('Mínimo 30, la habitual')).toBeTruthy()
    expect(actualizarFrecuencia).not.toHaveBeenCalled()

    await usuario.clear(within(panel).getByLabelText(/Máxima/, { selector: '#frecuencia-Primavera-maxima' }))
    await usuario.type(within(panel).getByLabelText(/Máxima/, { selector: '#frecuencia-Primavera-maxima' }), '45')
    await usuario.type(within(panel).getByLabelText(/Teórica/, { selector: '#frecuencia-Verano-teorica' }), '20')
    expect(within(panel).getByText(/solo afecta a los ciclos que se programen/)).toBeTruthy()
    await usuario.click(within(panel).getByRole('button', { name: 'Guardar cambios' }))

    expect(actualizarFrecuencia).toHaveBeenCalledExactlyOnceWith(1, 'Verano', { frecuencia_teorica_dias: 20 })
    expect(await screen.findByText('Configuración de Corte de césped guardada.')).toBeTruthy()
  })
})
