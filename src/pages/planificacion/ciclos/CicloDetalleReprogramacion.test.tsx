// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import type { Programacion, ServicioPeriodico } from '@/types/planificacion'
import CicloDetallePage from './CicloDetallePage'

const api = vi.hoisted(() => ({
  permisos: ['PLA.PLANIFICACION.GESTIONAR', 'PLA.PLANIFICACION.CONSULTAR'],
  ciclos: new Map<number, Programacion>(),
  obtener: vi.fn(),
  patch: vi.fn(),
  crear: vi.fn(),
  cancelar: vi.fn(),
}))
const original: Programacion = {
  id: 7,
  codigo: 'CF-2026-07',
  tipo_servicio_id: 2,
  servicio: 'Control fitosanitario',
  proveedor_id: 4,
  proveedor: 'Proveedor Demo',
  estacion: 'Primavera',
  fecha_inicio_prevista: '2026-11-20',
  fecha_fin_prevista: '2026-11-22',
  estado: 'Programada',
  fecha_inicio_real: null,
  fecha_fin_real: null,
  historial: [],
}
const servicios: ServicioPeriodico[] = [2, 3].map((id) => ({
  id,
  nombre: id === 2 ? 'Control fitosanitario' : 'Poda mayor programada',
  es_ruidoso: false,
  frecuencias: [],
  duracion: {
    duracion_maxima_dias: 3,
    dias_limpieza: 1,
    hora_inicio: null,
    hora_fin: null,
    fecha_modificacion: '2026-11-16T08:00:00-05:00',
    modificado_por: 'Jefe Demo',
  },
}))
vi.mock('@/services/api/planificacion', () => ({
  obtenerProgramacion: api.obtener,
  listarServiciosPeriodicos: async () => servicios,
  listarRestricciones: async () => [],
  obtenerPropuesta: async () => ({
    estacion: 'Primavera',
    fecha_inicio: '2026-12-01',
    fecha_fin: '2026-12-04',
    conflictos: [],
    ventana_libre_inicio: null,
  }),
  reprogramarProgramacion: api.patch,
  crearProgramacion: api.crear,
  cambiarEstadoCiclo: api.cancelar,
}))
vi.mock('@/services/api/tercerizados', () => ({
  listarProveedores: async () => ({}),
  listarTodo: async () => ({ resultados: [{ id: 4, razon_social: 'Proveedor Demo', activo: true }], completo: true }),
}))
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))
vi.mock('@/sesion/ContextoSesion', () => ({ usePermisos: () => api.permisos }))
vi.mock('@/layouts/LayoutOficina/AccionesPagina', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/utils/instanteLima', async (originalModulo) => ({
  ...(await originalModulo<typeof import('@/utils/instanteLima')>()),
  hoyLima: () => '2026-11-16',
}))

function RutaActual() {
  return <output aria-label="Ruta actual">{useLocation().pathname}</output>
}
function pintar() {
  render(
    <MemoryRouter initialEntries={['/planificacion/ciclos/7']}>
      <RutaActual />
      <Routes>
        <Route path="/planificacion/ciclos/:id" element={<CicloDetallePage />} />
      </Routes>
    </MemoryRouter>,
  )
}
async function abrir() {
  pintar()
  await userEvent.setup().click(await screen.findByRole('button', { name: 'Reprogramar' }))
  return screen.findByRole('dialog', { name: 'Reprogramar ciclo' })
}
function fechas() {
  fireEvent.change(screen.getByLabelText(/^Inicio/), { target: { value: '2026-11-24' } })
  fireEvent.change(screen.getByLabelText(/^Fin/), { target: { value: '2026-11-26' } })
}
function confirmar() {
  return within(screen.getByRole('dialog', { name: 'Reprogramar ciclo' })).getByRole('button', { name: 'Reprogramar' })
}
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    this.open = false
  }
})
beforeEach(() => {
  vi.resetAllMocks()
  api.permisos = ['PLA.PLANIFICACION.GESTIONAR', 'PLA.PLANIFICACION.CONSULTAR']
  api.ciclos.clear()
  api.ciclos.set(7, { ...original })
  api.obtener.mockImplementation(async (id: number) => ({ ...api.ciclos.get(id), restricciones: [] }))
  api.patch.mockImplementation(async (id: number, entrada: Partial<Programacion>) => {
    const actualizado = {
      ...original,
      ...entrada,
      id,
      historial: [
        {
          estado: 'Programada' as const,
          fecha_hora: '2026-11-16T10:00:00-05:00',
          autor: 'Jefe Demo',
          motivo: 'Reprogramada desde la ficha',
        },
      ],
    }
    api.ciclos.set(id, actualizado)
    return actualizado
  })
  api.crear.mockImplementation(async (entrada: Partial<Programacion>) => {
    const nuevo = {
      ...original,
      ...entrada,
      id: 17,
      codigo: 'CF-2026-17',
      servicio: entrada.tipo_servicio_id === 3 ? 'Poda mayor programada' : original.servicio,
    }
    api.ciclos.set(17, nuevo)
    return nuevo
  })
  api.cancelar.mockResolvedValue({ ...original, estado: 'Cancelada' })
})
afterEach(cleanup)

describe('Reprogramar desde la ficha: estados, contrato y navegación', () => {
  it('el jefe ve Reprogramar habilitado junto a Iniciar y Cancelar', async () => {
    pintar()
    const boton = await screen.findByRole('button', { name: 'Reprogramar' })
    expect(boton.getAttribute('aria-disabled')).not.toBe('true')
    expect(screen.getByRole('button', { name: 'Iniciar ciclo' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Cancelar ciclo' })).toBeTruthy()
  })
  it.each(['EnCurso', 'Completada', 'Cancelada'] as const)('no permite reprogramar en estado %s', async (estado) => {
    api.ciclos.set(7, {
      ...original,
      estado,
      fecha_inicio_real: '2026-11-16',
      fecha_fin_real: estado === 'Completada' ? '2026-11-16' : null,
    })
    pintar()
    await screen.findByText('Inicio real')
    expect(screen.queryByRole('button', { name: 'Reprogramar' })).toBeNull()
  })
  it('un usuario de consulta no ve las acciones de edición', async () => {
    api.permisos = ['PLA.PLANIFICACION.CONSULTAR']
    pintar()
    await screen.findByText('Programada')
    expect(screen.queryByRole('button', { name: 'Reprogramar' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Iniciar ciclo' })).toBeNull()
  })
  it('precarga servicio, proveedor y fechas sin reemplazarlas por la propuesta', async () => {
    await abrir()
    expect((screen.getByLabelText(/^Servicio/) as HTMLSelectElement).value).toBe('2')
    expect((screen.getByLabelText(/^Proveedor/) as HTMLSelectElement).value).toBe('4')
    expect((screen.getByLabelText(/^Inicio/) as HTMLInputElement).value).toBe('2026-11-20')
    expect((screen.getByLabelText(/^Fin/) as HTMLInputElement).value).toBe('2026-11-22')
  })
  it('solo fechas: hace PATCH, conserva id y muestra la ficha e historial actualizados', async () => {
    await abrir()
    fechas()
    await userEvent.setup().click(confirmar())
    await screen.findByText('24 al 26/11')
    expect(api.patch).toHaveBeenCalledExactlyOnceWith(
      7,
      expect.objectContaining({ fecha_inicio_prevista: '2026-11-24', fecha_fin_prevista: '2026-11-26' }),
    )
    expect(api.crear).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Ruta actual').textContent).toBe('/planificacion/ciclos/7')
    expect(await screen.findByText(/Ciclo reprogramado del 24 nov. al 26 nov./)).toBeTruthy()
  })
  it.each(['servicio', 'proveedor'])(
    'si cambia %s crea otro ciclo, cancela el anterior y navega al nuevo',
    async (campo) => {
      await abrir()
      const usuario = userEvent.setup()
      if (campo === 'servicio') await usuario.selectOptions(screen.getByLabelText(/^Servicio/), '3')
      else await usuario.selectOptions(screen.getByLabelText(/^Proveedor/), 'propio')
      fechas()
      await usuario.click(confirmar())
      await waitFor(() => expect(screen.getByLabelText('Ruta actual').textContent).toBe('/planificacion/ciclos/17'))
      expect(api.crear).toHaveBeenCalledTimes(1)
      expect(api.cancelar).toHaveBeenCalledWith(7, 'cancelacion', undefined, 'Reprogramado como CF-2026-17')
      expect(api.patch).not.toHaveBeenCalled()
    },
  )
  it.each([403, 409, 500, 0])('HTTP %i o desconexión conserva el borrador y no anuncia éxito', async (estado) => {
    api.patch.mockRejectedValueOnce(new ErrorApi(estado, 'rechazado', 'La operación fue rechazada'))
    await abrir()
    fechas()
    await userEvent.setup().click(confirmar())
    expect(await screen.findByText('No se pudo reprogramar el ciclo')).toBeTruthy()
    expect((screen.getByLabelText(/^Inicio/) as HTMLInputElement).value).toBe('2026-11-24')
    expect(screen.queryByText(/Ciclo reprogramado del/)).toBeNull()
    expect(screen.getByText('20 al 22/11')).toBeTruthy()
  })
  it('cerrar sin guardar no envía ninguna mutación', async () => {
    await abrir()
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))
    const descartar = screen.queryByRole('button', { name: 'Descartar cambios' })
    if (descartar) await usuario.click(descartar)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(api.patch).not.toHaveBeenCalled()
    expect(api.crear).not.toHaveBeenCalled()
    expect(api.cancelar).not.toHaveBeenCalled()
  })
  it('bloquea un periodo cuyo inicio es posterior al fin', async () => {
    await abrir()
    fireEvent.change(screen.getByLabelText(/^Inicio/), { target: { value: '2026-11-26' } })
    fireEvent.change(screen.getByLabelText(/^Fin/), { target: { value: '2026-11-24' } })
    expect(confirmar().getAttribute('aria-disabled')).toBe('true')
    await userEvent.setup().click(confirmar())
    expect(api.patch).not.toHaveBeenCalled()
  })
  it('exige quién realiza el servicio y conserva la ficha sin enviar datos incompletos', async () => {
    await abrir()
    const usuario = userEvent.setup()
    await usuario.selectOptions(screen.getByLabelText(/^Proveedor/), '')
    await usuario.click(confirmar())
    expect(screen.getByText('Elige quién lo hace.')).toBeTruthy()
    expect(api.patch).not.toHaveBeenCalled()
    expect(api.crear).not.toHaveBeenCalled()
  })
})
