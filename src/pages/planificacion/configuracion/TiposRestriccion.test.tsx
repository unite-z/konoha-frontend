// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { TipoRestriccion } from '@/types/planificacion'
import TiposRestriccion from './TiposRestriccion'
const api = vi.hoisted(() => ({ listar: vi.fn(), crear: vi.fn(), patch: vi.fn(), tipos: [] as TipoRestriccion[] }))
vi.mock('@/services/api/planificacion', () => ({
  listarTiposRestriccion: api.listar,
  crearTipoRestriccion: api.crear,
  modificarTipoRestriccion: api.patch,
}))
vi.mock('@/layouts/LayoutOficina/AccionesPagina', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
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
  api.tipos = [
    { id: 1, nombre: 'Ceremonia', efecto: 'Advertencia', aplica_servicios_ruidosos: true, activo: true },
    {
      id: 2,
      nombre: 'Cierre del campus',
      efecto: 'Favorable',
      aplica_servicios_ruidosos: false,
      activo: true,
      protegido: true,
    },
    { id: 3, nombre: 'Retirado', efecto: 'Advertencia', aplica_servicios_ruidosos: false, activo: false },
  ]
  api.listar.mockImplementation(async (_signal: AbortSignal, todos: boolean) =>
    api.tipos.filter((t) => todos || t.activo),
  )
  api.crear.mockImplementation(async (entrada) => {
    const nuevo = { id: 4, ...entrada, activo: true, ciclos_afectados: [] }
    api.tipos.push(nuevo)
    return nuevo
  })
  api.patch.mockImplementation(async (id: number, entrada: Partial<TipoRestriccion>) => {
    const tipo = api.tipos.find((t) => t.id === id)
    const nuevo = { ...tipo, ...entrada, ciclos_afectados: [] }
    api.tipos = api.tipos.map((t) => (t.id === id ? { ...t, ...entrada } : t))
    return nuevo
  })
})
afterEach(cleanup)
function pintar(puedeEditar = true) {
  render(
    <MemoryRouter>
      <TiposRestriccion puedeEditar={puedeEditar} />
    </MemoryRouter>,
  )
}
async function abrirCrear() {
  pintar()
  await screen.findByText('Ceremonia')
  await userEvent.setup().click(screen.getByRole('button', { name: 'Crear tipo' }))
  return screen.getByRole('dialog')
}
const guardar = () => within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar tipo' })
describe('Catálogo de tipos', () => {
  it('lista activos y permite consultar los inactivos', async () => {
    pintar()
    await screen.findByText('Ceremonia')
    expect(screen.queryByText('Retirado')).toBeNull()
    await userEvent.setup().click(screen.getByLabelText('Incluir tipos inactivos'))
    expect(await screen.findByText('Retirado')).toBeTruthy()
  })
  it('crea tipo, normaliza nombre y vuelve a consultar la tabla', async () => {
    await abrirCrear()
    await userEvent.setup().type(screen.getByLabelText(/^Nombre/), '  Graduación   nueva ')
    await userEvent.setup().click(guardar())
    expect(await screen.findByText('Graduación nueva')).toBeTruthy()
    expect(api.crear).toHaveBeenCalledWith({
      nombre: 'Graduación nueva',
      efecto: 'Advertencia',
      aplica_servicios_ruidosos: false,
    })
    expect(api.listar).toHaveBeenCalledTimes(2)
  })
  it('rechaza vacío antes de enviar', async () => {
    await abrirCrear()
    await userEvent.setup().click(guardar())
    expect(screen.getByText('Indica el nombre del tipo.')).toBeTruthy()
    expect(api.crear).not.toHaveBeenCalled()
  })
  it('precarga efecto y ruidosos, guarda cambio y muestra ciclos afectados con enlaces', async () => {
    api.patch.mockResolvedValueOnce({
      ...api.tipos[0],
      efecto: 'Prohibicion',
      ciclos_afectados: [
        { id: 44, servicio: 'Corte de césped', fecha_inicio_prevista: '2026-12-01', fecha_fin_prevista: '2026-12-03' },
      ],
    })
    pintar()
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Editar Ceremonia' }))
    expect((screen.getByLabelText(/^Efecto/) as HTMLSelectElement).value).toBe('Advertencia')
    expect((screen.getByLabelText('Solo servicios ruidosos') as HTMLInputElement).checked).toBe(true)
    await userEvent.setup().selectOptions(screen.getByLabelText(/^Efecto/), 'Prohibicion')
    await userEvent.setup().click(screen.getByLabelText('Solo servicios ruidosos'))
    await userEvent.setup().click(guardar())
    expect(await screen.findByText('1 ciclo requiere revisión')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Revisar ciclo' }).getAttribute('href')).toBe('/planificacion/ciclos/44')
  })
  it('confirma la baja, conserva el tipo inactivo y permite reactivarlo', async () => {
    pintar()
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Desactivar Ceremonia' }))
    expect(screen.getByText(/Las restricciones registradas anteriormente se conservarán/)).toBeTruthy()
    expect(api.patch).not.toHaveBeenCalled()
    await userEvent.setup().click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Desactivar tipo' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Editar Ceremonia' })).toBeNull())
    await userEvent.setup().click(screen.getByLabelText('Incluir tipos inactivos'))
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Editar Ceremonia' }))
    expect((screen.getByLabelText('Tipo activo') as HTMLInputElement).checked).toBe(false)
    await userEvent.setup().click(screen.getByLabelText('Tipo activo'))
    await userEvent.setup().click(guardar())
    await waitFor(() => expect(api.patch).toHaveBeenLastCalledWith(1, expect.objectContaining({ activo: true })))
  })
  it('protege el nombre y la baja del campus, permite editar efecto', async () => {
    pintar()
    const baja = await screen.findByRole('button', { name: 'Desactivar Cierre del campus' })
    expect(baja.getAttribute('aria-disabled')).toBe('true')
    await userEvent.setup().click(baja)
    expect(screen.queryByRole('dialog')).toBeNull()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Editar Cierre del campus' }))
    expect((screen.getByLabelText(/^Nombre/) as HTMLInputElement).disabled).toBe(true)
    expect((screen.getByLabelText('Tipo activo') as HTMLInputElement).disabled).toBe(true)
    expect(screen.getAllByText(/poda mayor/).length).toBeGreaterThan(0)
  })
  it('sin gestionar muestra tabla sin acciones', async () => {
    pintar(false)
    await screen.findByText('Ceremonia')
    expect(screen.queryByRole('button', { name: 'Crear tipo' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Editar Ceremonia' })).toBeNull()
  })
  it('conserva formulario tras rechazo, permite reintentar y no muestra éxito falso', async () => {
    api.crear.mockRejectedValueOnce(new Error('Nombre duplicado'))
    await abrirCrear()
    await userEvent.setup().type(screen.getByLabelText(/^Nombre/), 'Nuevo')
    await userEvent.setup().click(guardar())
    expect(await screen.findByText('Nombre duplicado')).toBeTruthy()
    expect((screen.getByLabelText(/^Nombre/) as HTMLInputElement).value).toBe('Nuevo')
    await userEvent.setup().click(guardar())
    expect(await screen.findByText('Tipo Nuevo guardado.')).toBeTruthy()
  })
  it('dos submit síncronos generan una sola solicitud', async () => {
    api.crear.mockImplementation(() => new Promise(() => {}))
    await abrirCrear()
    await userEvent.setup().type(screen.getByLabelText(/^Nombre/), 'Nuevo')
    const formulario = screen.getByRole('dialog').querySelector('form') as HTMLFormElement
    act(() => {
      fireEvent.submit(formulario)
      fireEvent.submit(formulario)
    })
    expect(api.crear).toHaveBeenCalledTimes(1)
  })
  it('muestra error de carga y ofrece reintento', async () => {
    api.listar.mockRejectedValueOnce(new Error('Carga fallida'))
    pintar()
    await screen.findByText('No pudimos cargar los tipos')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Ceremonia')).toBeTruthy()
  })
})
