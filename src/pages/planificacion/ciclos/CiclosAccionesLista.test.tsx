// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import type { Programacion } from '@/types/planificacion'
import CiclosPage from './CiclosPage'

const api = vi.hoisted(() => ({
  permisos: ['PLA.PLANIFICACION.GESTIONAR'],
  ciclos: [] as Programacion[],
  listar: vi.fn(),
  cambiar: vi.fn(),
  servicios: vi.fn(),
  patch: vi.fn(),
  crear: vi.fn(),
}))
const base: Programacion = {
  id: 1,
  codigo: 'CF-01',
  tipo_servicio_id: 2,
  servicio: 'Control fitosanitario',
  proveedor_id: null,
  proveedor: null,
  estacion: 'Primavera',
  fecha_inicio_prevista: '2026-11-20',
  fecha_fin_prevista: '2026-11-22',
  estado: 'Programada',
  fecha_inicio_real: null,
  fecha_fin_real: null,
}
vi.mock('@/services/api/planificacion', () => ({
  listarProgramaciones: api.listar,
  cambiarEstadoCiclo: api.cambiar,
  listarServiciosPeriodicos: api.servicios,
  reprogramarProgramacion: api.patch,
  crearProgramacion: api.crear,
  listarRestricciones: async () => [],
  obtenerPropuesta: async () => ({
    estacion: 'Primavera',
    fecha_inicio: '2026-11-24',
    fecha_fin: '2026-11-26',
    conflictos: [],
    ventana_libre_inicio: null,
  }),
}))
vi.mock('@/services/api/tercerizados', () => ({
  listarProveedores: async () => ({}),
  listarTodo: async () => ({ resultados: [], completo: true }),
}))
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))
vi.mock('@/sesion/ContextoSesion', () => ({ usePermisos: () => api.permisos }))
vi.mock('@/utils/instanteLima', async (original) => ({
  ...(await original<typeof import('@/utils/instanteLima')>()),
  hoyLima: () => '2026-11-16',
}))
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
  api.permisos = ['PLA.PLANIFICACION.GESTIONAR']
  api.ciclos = [{ ...base }]
  api.listar.mockImplementation(async () => api.ciclos.map((c) => ({ ...c })))
  api.servicios.mockResolvedValue([
    {
      id: 2,
      nombre: base.servicio,
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
    },
  ])
  api.cambiar.mockImplementation(async (_id: number, cambio: string) => {
    api.ciclos = [
      {
        ...base,
        estado: cambio === 'inicio' ? 'EnCurso' : cambio === 'fin' ? 'Completada' : 'Cancelada',
        fecha_inicio_real: '2026-11-16',
      },
    ]
    return api.ciclos[0]
  })
  api.patch.mockImplementation(async (_id: number, entrada: Partial<Programacion>) => {
    api.ciclos = [{ ...base, ...entrada }]
    return api.ciclos[0]
  })
})
afterEach(cleanup)
function pintar() {
  return render(
    <MemoryRouter initialEntries={['/planificacion/ciclos']}>
      <Routes>
        <Route path="/planificacion/ciclos" element={<CiclosPage />} />
        <Route path="/planificacion/ciclos/:id" element={<p>Ficha abierta</p>} />
      </Routes>
    </MemoryRouter>,
  )
}
async function accion(nombre: string) {
  await userEvent.setup().click(await screen.findByRole('button', { name: nombre }))
  expect(screen.queryByText('Ficha abierta')).toBeNull()
}
function confirmar(nombre: string) {
  return within(screen.getByRole('dialog')).getByRole('button', { name: nombre })
}

describe('Acciones reales desde la lista', () => {
  it.each(['Completada', 'Cancelada'] as const)('%s no tiene botones de fila', async (estado) => {
    api.ciclos = [{ ...base, estado }]
    pintar()
    await screen.findByText('CF-01')
    expect(within(screen.getAllByRole('row')[1]).queryAllByRole('button')).toHaveLength(0)
  })
  it('oculta columna y acciones sin permiso efectivo de gestionar', async () => {
    api.permisos = ['PLA.PLANIFICACION.CONSULTAR']
    pintar()
    await screen.findByText('CF-01')
    expect(screen.queryByRole('columnheader', { name: 'Acciones' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Iniciar CF/ })).toBeNull()
  })
  it.each(['{Enter}', ' '])('el botón se activa con %s sin navegar', async (tecla) => {
    pintar()
    const boton = await screen.findByRole('button', { name: 'Iniciar CF-01' })
    boton.focus()
    await userEvent.setup().keyboard(tecla)
    expect(screen.getByRole('dialog', { name: 'Iniciar CF-01' })).toBeTruthy()
    expect(screen.queryByText('Ficha abierta')).toBeNull()
  })
  it.each(['clic', 'Enter'])('la fila abre la ficha con %s fuera de controles', async (tipo) => {
    pintar()
    await screen.findByText('CF-01')
    const fila = screen.getAllByRole('row')[1]
    if (tipo === 'clic') await userEvent.setup().click(screen.getByText('CF-01'))
    else {
      fila.focus()
      await userEvent.setup().keyboard('{Enter}')
    }
    expect(await screen.findByText('Ficha abierta')).toBeTruthy()
  })
  it.each([
    ['inicio', 'Iniciar', 'Iniciar ciclo', 'Ciclo iniciado.'],
    ['fin', 'Finalizar', 'Finalizar ciclo', 'Ciclo finalizado.'],
  ] as const)('%s actualiza la fila y muestra éxito', async (cambio, accionTexto, confirmarTexto, mensaje) => {
    if (cambio === 'fin') api.ciclos = [{ ...base, estado: 'EnCurso', fecha_inicio_real: '2026-11-16' }]
    pintar()
    await accion(`${accionTexto} CF-01`)
    await userEvent.setup().click(confirmar(confirmarTexto))
    expect(await screen.findByText(mensaje)).toBeTruthy()
    await waitFor(() => expect(api.listar).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByRole('button', { name: `${accionTexto} CF-01` })).toBeNull())
  })
  it('cancelar exige motivo y lo envía recortado; actualiza lista y contadores', async () => {
    pintar()
    await accion('Cancelar CF-01')
    await userEvent.setup().click(confirmar('Cancelar ciclo'))
    expect(api.cambiar).not.toHaveBeenCalled()
    expect(screen.getByText('Escribe el motivo de la cancelación.')).toBeTruthy()
    await userEvent.setup().type(screen.getByLabelText(/Motivo/), '  Prueba desde lista  ')
    await userEvent.setup().click(confirmar('Cancelar ciclo'))
    expect(await screen.findByText('Ciclo cancelado.')).toBeTruthy()
    expect(api.cambiar).toHaveBeenCalledWith(1, 'cancelacion', undefined, 'Prueba desde lista')
    await waitFor(() => expect(within(screen.getAllByRole('row')[1]).getByText('Cancelada')).toBeTruthy())
    expect(screen.getByRole('tab', { name: 'Programados 0' })).toBeTruthy()
  })
  it.each([403, 409, 500])('el rechazo %s conserva formulario sin éxito y permite reintentar', async (estado) => {
    api.cambiar.mockRejectedValueOnce(new ErrorApi(estado, 'rechazo', 'Operación rechazada'))
    pintar()
    await accion('Iniciar CF-01')
    await userEvent.setup().click(confirmar('Iniciar ciclo'))
    expect(await screen.findByText('No se pudo registrar el cambio')).toBeTruthy()
    expect(screen.queryByText('Ciclo iniciado.')).toBeNull()
    expect(api.listar).toHaveBeenCalledTimes(1)
    await userEvent.setup().click(confirmar('Iniciar ciclo'))
    expect(await screen.findByText('Ciclo iniciado.')).toBeTruthy()
  })
  it('rechaza fecha futura antes de llamar a API', async () => {
    pintar()
    await accion('Iniciar CF-01')
    fireEvent.change(screen.getByLabelText(/Fecha de inicio real/), { target: { value: '2026-11-17' } })
    fireEvent.submit(screen.getByRole('dialog').querySelector('form') as HTMLFormElement)
    expect(api.cambiar).not.toHaveBeenCalled()
  })
  it('dos envíos síncronos solo generan una petición', async () => {
    api.cambiar.mockImplementation(() => new Promise(() => {}))
    pintar()
    await accion('Iniciar CF-01')
    const formulario = screen.getByRole('dialog').querySelector('form') as HTMLFormElement
    act(() => {
      fireEvent.submit(formulario)
      fireEvent.submit(formulario)
    })
    expect(api.cambiar).toHaveBeenCalledTimes(1)
  })
  it('reprogramar precarga fechas, conserva identidad y vuelve a consultar sin abrir ficha', async () => {
    pintar()
    await accion('Reprogramar CF-01')
    await screen.findByRole('dialog', { name: 'Reprogramar ciclo' })
    expect((screen.getByLabelText(/^Inicio/) as HTMLInputElement).value).toBe('2026-11-20')
    expect((screen.getByLabelText(/^Fin/) as HTMLInputElement).value).toBe('2026-11-22')
    fireEvent.change(screen.getByLabelText(/^Inicio/), { target: { value: '2026-11-24' } })
    fireEvent.change(screen.getByLabelText(/^Fin/), { target: { value: '2026-11-26' } })
    await userEvent.setup().click(confirmar('Reprogramar'))
    expect(await screen.findByText(/Ciclo reprogramado del/)).toBeTruthy()
    await waitFor(() => expect(api.listar).toHaveBeenCalledTimes(2))
    expect(screen.queryByText('Ficha abierta')).toBeNull()
    expect(api.patch.mock.calls[0][0]).toBe(1)
    expect(await screen.findByText('24/11 al 26/11')).toBeTruthy()
  })
  it('cambiar identidad recupera una cancelación parcial sin duplicar el nuevo ciclo ni salir de la lista', async () => {
    const servicios = await api.servicios()
    api.servicios.mockResolvedValue([...servicios, { ...servicios[0], id: 3, nombre: 'Poda mayor programada' }])
    const nuevo = {
      ...base,
      id: 2,
      codigo: 'PM-02',
      tipo_servicio_id: 3,
      servicio: 'Poda mayor programada',
      fecha_inicio_prevista: '2026-11-24',
      fecha_fin_prevista: '2026-11-26',
    }
    api.crear.mockImplementation(async () => {
      api.ciclos = [{ ...base }, nuevo]
      return nuevo
    })
    api.cambiar.mockRejectedValueOnce(new ErrorApi(503, 'indisponible', 'Cancelación temporalmente no disponible'))
    api.cambiar.mockImplementationOnce(async () => {
      api.ciclos = [{ ...base, estado: 'Cancelada' }, nuevo]
      return api.ciclos[0]
    })
    pintar()
    await accion('Reprogramar CF-01')
    await screen.findByRole('dialog', { name: 'Reprogramar ciclo' })
    await userEvent.setup().selectOptions(screen.getByLabelText(/^Servicio/), '3')
    fireEvent.change(screen.getByLabelText(/^Inicio/), { target: { value: '2026-11-24' } })
    fireEvent.change(screen.getByLabelText(/^Fin/), { target: { value: '2026-11-26' } })
    await userEvent.setup().click(confirmar('Reprogramar'))
    expect(
      await screen.findByText('El ciclo nuevo quedó programado, pero no se pudo cancelar el anterior'),
    ).toBeTruthy()
    expect(screen.queryByText(/Ciclo reprogramado del/)).toBeNull()
    await userEvent.setup().click(confirmar('Reintentar cancelación'))
    expect(await screen.findByText(/Ciclo reprogramado del/)).toBeTruthy()
    expect(await screen.findByText('PM-02')).toBeTruthy()
    expect(api.crear).toHaveBeenCalledTimes(1)
    expect(api.cambiar).toHaveBeenCalledTimes(2)
    expect(api.patch).not.toHaveBeenCalled()
    expect(screen.queryByText('Ficha abierta')).toBeNull()
  })
  it('error al cargar servicios se muestra y permite reintento', async () => {
    api.servicios.mockRejectedValueOnce(new ErrorApi(503, 'indisponible', 'Servicios no disponibles'))
    pintar()
    await accion('Reprogramar CF-01')
    expect(await screen.findByText('No pudimos cargar los servicios para reprogramar')).toBeTruthy()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('dialog', { name: 'Reprogramar ciclo' })).toBeTruthy()
  })
  it('error al refrescar no se oculta detrás de datos antiguos', async () => {
    pintar()
    await accion('Iniciar CF-01')
    api.listar.mockRejectedValueOnce(new ErrorApi(503, 'indisponible', 'Lista no disponible'))
    await userEvent.setup().click(confirmar('Iniciar ciclo'))
    expect(await screen.findByText('No pudimos actualizar los ciclos')).toBeTruthy()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(api.listar).toHaveBeenCalledTimes(3))
  })
})
