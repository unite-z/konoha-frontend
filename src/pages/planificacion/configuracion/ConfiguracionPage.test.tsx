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
const darDeBajaRestriccion = vi.fn(async (_id: number, _serie: boolean) => undefined)
vi.mock('@/services/api/planificacion', () => ({
  listarServiciosPeriodicos: async () => [servicio],
  listarProgramaciones: async () => [],
  listarRestricciones: async () => [
    { id: 8, tipo_restriccion_id: 1, tipo: 'Clases', efecto: 'Advertencia', aplica_servicios_ruidosos: true, fecha_inicio: '2026-11-09', fecha_fin: '2026-11-09', hora_inicio: null, hora_fin: null, area_verde_id: null, descripcion: null, serie: 'a' },
    { id: 9, tipo_restriccion_id: 1, tipo: 'Clases', efecto: 'Advertencia', aplica_servicios_ruidosos: true, fecha_inicio: '2026-11-16', fecha_fin: '2026-11-16', hora_inicio: null, hora_fin: null, area_verde_id: null, descripcion: null, serie: 'a' },
  ],
  darDeBajaRestriccion: (id: number, serie: boolean) => darDeBajaRestriccion(id, serie),
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

    await usuario.clear(within(panel).getByLabelText(/máxima en Primavera/))
    await usuario.type(within(panel).getByLabelText(/máxima en Primavera/), '25')
    expect(within(panel).getByText('Primavera: la máxima no puede ser menor que la práctica')).toBeTruthy()
    expect(within(panel).getByRole('button', { name: 'Guardar cambios' }).getAttribute('aria-disabled')).toBe('true')
    await usuario.click(within(panel).getByRole('button', { name: 'Guardar cambios' }))
    expect(actualizarFrecuencia).not.toHaveBeenCalled()

    await usuario.clear(within(panel).getByLabelText(/máxima en Primavera/))
    await usuario.type(within(panel).getByLabelText(/máxima en Primavera/), '45')
    await usuario.type(within(panel).getByLabelText(/teórica en Verano/), '20')
    // Servicio aún incompleto (sin duración): como en Figma 367-3334, sin el aviso de los ciclos ya programados.
    expect(within(panel).queryByText(/Solo afecta a los ciclos que se programen/)).toBeNull()
    await usuario.click(within(panel).getByRole('button', { name: 'Guardar cambios' }))

    expect(actualizarFrecuencia).toHaveBeenCalledExactlyOnceWith(1, 'Verano', { frecuencia_teorica_dias: 20 })
    expect(await screen.findByText('Configuración de Corte de césped guardada.')).toBeTruthy()
  })

  it('la pestaña de series lista cada serie y la da de baja entera', async () => {
    render(
      <MemoryRouter>
        <ConfiguracionPage />
      </MemoryRouter>,
    )
    const usuario = userEvent.setup()
    await usuario.click(await screen.findByRole('tab', { name: 'Series de restricciones 1' }))
    const tabla = screen.getByRole('table')
    // Como en Figma 366-3687: fechas «Cada lunes · hasta 16/11» y alcance «Ruidosos · todo el campus».
    expect(within(tabla).getByText('Cada lunes · hasta 16/11')).toBeTruthy()
    expect(within(tabla).getByText('Ruidosos · todo el campus')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Nueva restricción' })).toBeTruthy()

    await usuario.click(within(tabla).getByRole('button', { name: 'Dar de baja Clases' }))
    await usuario.click(screen.getByRole('button', { name: 'Dar de baja la serie' }))
    expect(darDeBajaRestriccion).toHaveBeenCalledWith(8, true)
    expect(await screen.findByText('No hay restricciones próximas')).toBeTruthy()
  })
})
