// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import EncargosPage from './EncargosPage'

const sesion = vi.hoisted(() => ({ permisos: [] as string[] }))
const JEFE = ['CAM.CUADRILLA.CONSULTAR', 'CAM.CUADRILLA.GESTIONAR']
const CAPATAZ = ['CAM.CUADRILLA.CONSULTAR', 'CAM.PARTE.REGISTRAR', 'PLA.ENCARGO.ACTUALIZAR_ESTADO']

vi.mock('@/sesion/ContextoSesion', () => ({ usePermisos: () => sesion.permisos }))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close ??= function () {
    this.open = false
  }
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const encargo = {
  id: 5,
  cuadrilla_id: 7,
  capataz_id: 3,
  tipo_actividad_id: 2,
  area_verde_id: 2,
  descripcion: 'Podar junto al sendero',
  periodicidad: 'Directo',
  fecha_reunion: null,
  fecha_inicio: '2099-06-01',
  fecha_fin: '2099-06-20',
  plazo_previsto: '2099-06-20',
  estado: 'Por completar',
  historial_estados: [],
  cuadrilla_nombre: 'Cuadrilla Norte',
  capataz_nombre: 'María',
  tipo_actividad_nombre: 'Poda',
  area_verde_nombre: 'Jardín A',
}

function simularSeguimiento(cambiar: (cuerpo: unknown) => void) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (ruta: string, opciones: RequestInit = {}) => {
      const path = new URL(ruta, 'http://localhost').pathname
      if (opciones.method === 'POST') {
        cambiar(JSON.parse(String(opciones.body)))
        return Response.json({ ...encargo, estado: 'En curso' })
      }
      if (path.endsWith('/encargos/5/')) return Response.json(encargo)
      const resultados = path.endsWith('/encargos/') ? [encargo] : []
      return Response.json({ count: resultados.length, results: resultados, next: null, previous: null })
    }),
  )
}

it('envía el encargo directo con plazo y sin reunión ni periodo', async () => {
  sesion.permisos = JEFE
  const guardar = vi.fn()
  vi.stubGlobal(
    'fetch',
    vi.fn(async (ruta: string, opciones: RequestInit = {}) => {
      const path = new URL(ruta, 'http://localhost').pathname
      if (opciones.method === 'POST') {
        guardar(JSON.parse(String(opciones.body)))
        return Response.json({ id: 1 })
      }
      const resultados = path.endsWith('/cuadrillas/')
        ? [{ id: 7, nombre: 'Cuadrilla Norte', capataz_nombre: 'María', activa: true }]
        : path.includes('/catalogos/')
          ? [{ id: 2, nombre: 'Catálogo de prueba', activo: true }]
          : []
      return Response.json({ count: resultados.length, results: resultados, next: null, previous: null })
    }),
  )
  render(<EncargosPage />, { wrapper: MemoryRouter })
  const usuario = userEvent.setup()
  await usuario.click(screen.getByRole('button', { name: 'Registrar encargo' }))
  const formulario = within(screen.getByRole('dialog'))
  await usuario.selectOptions(await formulario.findByLabelText('Modalidad'), 'Directo')
  expect(formulario.queryByLabelText(/Fecha de reunión|Inicio del periodo|Fin del periodo/)).toBeNull()
  await usuario.selectOptions(formulario.getByLabelText(/Cuadrilla y capataz/), '7')
  await usuario.selectOptions(formulario.getByLabelText(/Tipo de actividad/), '2')
  await usuario.selectOptions(formulario.getByLabelText(/Espacio/), '2')
  fireEvent.change(formulario.getByLabelText(/Plazo previsto/), { target: { value: '2099-06-20' } })
  await usuario.type(formulario.getByLabelText(/Descripción del encargo/), 'Podar junto al sendero')
  await usuario.click(formulario.getByRole('button', { name: 'Guardar encargo' }))
  await waitFor(() =>
    expect(guardar).toHaveBeenCalledWith({
      cuadrilla_id: 7,
      tipo_actividad_id: 2,
      area_verde_id: 2,
      descripcion: 'Podar junto al sendero',
      periodicidad: 'Directo',
      plazo_previsto: '2099-06-20',
    }),
  )
})

it('el capataz con PLA.ENCARGO.ACTUALIZAR_ESTADO avanza el estado de su encargo', async () => {
  sesion.permisos = CAPATAZ
  const cambiar = vi.fn()
  simularSeguimiento(cambiar)
  render(<EncargosPage />, { wrapper: MemoryRouter })
  const usuario = userEvent.setup()
  await usuario.click(await screen.findByRole('button', { name: 'Seguimiento del encargo 5' }))
  const dialogo = within(screen.getByRole('dialog'))
  const selector = await dialogo.findByLabelText(/Nuevo estado/)
  expect(within(selector).queryByRole('option', { name: 'Cancelado' })).toBeNull()
  await usuario.selectOptions(selector, 'En curso')
  await usuario.click(dialogo.getByRole('button', { name: 'Guardar estado' }))
  await waitFor(() =>
    expect(cambiar).toHaveBeenCalledWith({
      estado_anterior: 'Por completar',
      estado: 'En curso',
      observaciones: '',
    }),
  )
})

it('sin PLA.ENCARGO.ACTUALIZAR_ESTADO el seguimiento es solo de consulta', async () => {
  sesion.permisos = ['CAM.CUADRILLA.CONSULTAR']
  simularSeguimiento(vi.fn())
  render(<EncargosPage />, { wrapper: MemoryRouter })
  const usuario = userEvent.setup()
  await usuario.click(await screen.findByRole('button', { name: 'Seguimiento del encargo 5' }))
  const dialogo = within(screen.getByRole('dialog'))
  expect(await dialogo.findByText('Sin cambios de estado registrados.')).toBeTruthy()
  expect(dialogo.queryByLabelText(/Nuevo estado/)).toBeNull()
})

it('marca los encargos vencidos con un texto y permite filtrar solo los vencidos (AV-403)', async () => {
  sesion.permisos = CAPATAZ
  const peticiones: URL[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (ruta: string) => {
      const url = new URL(ruta, 'http://localhost')
      peticiones.push(url)
      const resultados = url.pathname.endsWith('/encargos/')
        ? [
            { ...encargo, vencido: true },
            { ...encargo, id: 6, descripcion: 'Regar el vivero', vencido: false },
          ]
        : []
      return Response.json({ count: resultados.length, results: resultados, next: null, previous: null })
    }),
  )
  render(<EncargosPage />, { wrapper: MemoryRouter })
  const tabla = await screen.findByRole('table')
  const filas = within(tabla).getAllByRole('row')
  expect(within(filas[1]).getByText('Vencido')).toBeTruthy()
  expect(within(filas[2]).queryByText('Vencido')).toBeNull()

  await userEvent.setup().selectOptions(screen.getByLabelText('Vencimiento'), 'true')
  await waitFor(() =>
    expect(peticiones.some((url) => url.pathname.endsWith('/encargos/') && url.searchParams.get('vencidos') === 'true')).toBe(true),
  )
})
