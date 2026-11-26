// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import type { CuadrillaCampo, EncargoCampo } from '@/types/operacionCampo'
import CuadrillasPage from '../Cuadrillas/CuadrillasPage'
import { rutaEncargo, rutaEncargoNuevo } from '../enlaces'

const api = vi.hoisted(() => ({
  campoApi: vi.fn(),
  todosCampo: vi.fn(),
  listarCuadrillasCampo: vi.fn(),
  permisos: [] as string[],
}))
vi.mock('@/services/api/operacionCampo', () => ({
  campoApi: api.campoApi,
  todosCampo: api.todosCampo,
  listarCuadrillasCampo: api.listarCuadrillasCampo,
}))
vi.mock('@/sesion/ContextoSesion', () => ({ usePermisos: () => api.permisos }))

const JEFE = ['CAM.CUADRILLA.CONSULTAR', 'CAM.CUADRILLA.GESTIONAR', 'CAM.PARTE.CONSULTAR']
const CAPATAZ = ['CAM.CUADRILLA.CONSULTAR', 'PLA.ENCARGO.ACTUALIZAR_ESTADO', 'CAM.PARTE.CONSULTAR']
const LECTOR = ['CAM.CUADRILLA.CONSULTAR']
const SEMANA = '?semana=2099-06-01'

const norte: CuadrillaCampo = {
  id: 1,
  nombre: 'Norte',
  capataz_id: 1,
  capataz_nombre: 'Capataz Norte',
  activa: true,
  operarios: [],
  cantidad_operarios: 0,
}

const podar: EncargoCampo = {
  id: 5,
  cuadrilla_id: 1,
  capataz_id: 1,
  tipo_actividad_id: 2,
  area_verde_id: 3,
  descripcion: 'Podar el seto',
  periodicidad: 'Semanal',
  fecha_reunion: '2099-06-01',
  fecha_inicio: '2099-06-02',
  fecha_fin: '2099-06-04',
  plazo_previsto: '2099-06-04',
  estado: 'Por completar',
  cuadrilla_nombre: 'Norte',
  capataz_nombre: 'Capataz Norte',
  tipo_actividad_nombre: 'Poda',
  area_verde_nombre: 'Jardín A',
}

const completo: EncargoCampo = {
  ...podar,
  historial_estados: [
    {
      id: 1,
      estado_anterior: 'Por completar',
      estado_nuevo: 'En curso',
      observaciones: 'Empezamos por el norte',
      autor: 'Capataz Norte',
      fecha: '2099-06-02T10:00:00-05:00',
    },
  ],
  reprogramaciones: [
    {
      id: 1,
      fecha_inicio_anterior: '2099-06-01',
      fecha_fin_anterior: '2099-06-03',
      plazo_anterior: '2099-06-03',
      fecha_inicio_nueva: '2099-06-02',
      fecha_fin_nueva: '2099-06-04',
      plazo_nuevo: '2099-06-04',
      justificacion: 'Llovió el lunes',
      autor: 'Jefe',
      fecha: '2099-06-01T09:00:00-05:00',
    },
  ],
}

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close ??= function () {
    this.open = false
  }
})

/** Respuestas de `todosCampo` según el recurso: semana de encargos y catálogos del formulario. */
function listados(ruta: string) {
  if (ruta === 'cuadrillas/') return Promise.resolve([norte])
  if (ruta === 'catalogos/tipos-actividad/') return Promise.resolve([{ id: 2, nombre: 'Poda', activo: true }])
  if (ruta === 'catalogos/areas-verdes/') {
    return Promise.resolve([
      { id: 3, nombre: 'Jardín A', activo: true },
      { id: 4, nombre: 'Jardín B', activo: true },
    ])
  }
  return Promise.resolve([podar])
}

beforeEach(() => {
  api.permisos = JEFE
  api.listarCuadrillasCampo.mockResolvedValue([norte])
  api.todosCampo.mockImplementation(listados)
  api.campoApi.mockImplementation((ruta: string) => {
    if (ruta === 'encargos/5/') return Promise.resolve(completo)
    if (ruta === 'actividades/') return Promise.resolve({ count: 0, results: [], next: null, previous: null })
    return Promise.resolve({})
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function montar(ruta: string) {
  const router = createMemoryRouter([{ path: '/n/planificacion/cuadrillas', Component: CuadrillasPage }], {
    initialEntries: [ruta],
  })
  render(<RouterProvider router={router} />)
  return router
}

const abrirPestana = async (nombre: string) => {
  const usuario = userEvent.setup()
  await usuario.click(await screen.findByRole('tab', { name: nombre }))
  return usuario
}

describe('enlaces del encargo', () => {
  it('rutaEncargo y rutaEncargoNuevo apuntan a Cuadrillas con los parámetros del contrato', () => {
    expect(rutaEncargo(7)).toBe('/n/planificacion/cuadrillas?encargo_id=7')
    expect(rutaEncargoNuevo()).toBe('/n/planificacion/cuadrillas?encargo=nuevo')
    expect(rutaEncargoNuevo(12)).toBe('/n/planificacion/cuadrillas?encargo=nuevo&area=12')
  })
})

describe('alta del encargo', () => {
  it('«+ Encargo» solo aparece con permiso de gestión', async () => {
    montar(`/n/planificacion/cuadrillas${SEMANA}`)
    expect(await screen.findByRole('button', { name: 'Encargo' })).toBeTruthy()
    cleanup()
    api.permisos = CAPATAZ
    montar(`/n/planificacion/cuadrillas${SEMANA}`)
    await screen.findByRole('heading', { name: 'Cuadrillas' })
    expect(screen.queryByRole('button', { name: 'Encargo' })).toBeNull()
  })

  it('el capataz no abre el alta aunque la URL lo pida', async () => {
    api.permisos = CAPATAZ
    montar(`/n/planificacion/cuadrillas${SEMANA}&encargo=nuevo`)
    await screen.findByRole('heading', { name: 'Cuadrillas' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('?encargo=nuevo&area= abre el formulario con el espacio puesto', async () => {
    montar(`/n/planificacion/cuadrillas${SEMANA}&encargo=nuevo&area=4`)
    const dialogo = await screen.findByRole('dialog', { name: 'Registrar encargo' })
    const espacio = (await within(dialogo).findByLabelText(/Espacio/)) as HTMLSelectElement
    expect(espacio.value).toBe('4')
  })

  it('«+ Encargo» abre el formulario y valida los obligatorios', async () => {
    const usuario = userEvent.setup()
    const router = montar(`/n/planificacion/cuadrillas${SEMANA}`)
    await usuario.click(await screen.findByRole('button', { name: 'Encargo' }))
    expect(router.state.location.search).toContain('encargo=nuevo')
    const dialogo = await screen.findByRole('dialog', { name: 'Registrar encargo' })
    await within(dialogo).findByLabelText(/Cuadrilla y capataz/)
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar encargo' }))
    expect(await within(dialogo).findAllByText('Selecciona una cuadrilla')).not.toHaveLength(0)
    expect(api.campoApi).not.toHaveBeenCalledWith('encargos/', expect.objectContaining({ metodo: 'POST' }))
  })

  it('el encargo Directo pide solo el plazo y se registra con POST', async () => {
    const usuario = userEvent.setup()
    api.campoApi.mockImplementation((ruta: string, opciones?: { metodo?: string }) => {
      if (ruta === 'encargos/' && opciones?.metodo === 'POST') return Promise.resolve({ ...podar, id: 9 })
      if (ruta === 'encargos/9/') return Promise.resolve({ ...podar, id: 9 })
      return Promise.resolve({ count: 0, results: [], next: null, previous: null })
    })
    const router = montar(`/n/planificacion/cuadrillas${SEMANA}&encargo=nuevo&area=3`)
    const dialogo = await screen.findByRole('dialog', { name: 'Registrar encargo' })
    await usuario.selectOptions(await within(dialogo).findByLabelText(/Modalidad/), 'Directo')
    expect(within(dialogo).queryByLabelText(/Inicio del periodo/)).toBeNull()
    expect(within(dialogo).getByLabelText(/Plazo previsto/)).toBeTruthy()
    await usuario.selectOptions(within(dialogo).getByLabelText(/Cuadrilla y capataz/), '1')
    await usuario.selectOptions(within(dialogo).getByLabelText(/Tipo de actividad/), '2')
    fireEvent.change(within(dialogo).getByLabelText(/Plazo previsto/), { target: { value: '2099-07-01' } })
    await usuario.type(within(dialogo).getByLabelText(/Descripción del encargo/), '  Regar los arbustos ')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar encargo' }))
    await waitFor(() =>
      expect(api.campoApi).toHaveBeenCalledWith(
        'encargos/',
        expect.objectContaining({
          metodo: 'POST',
          cuerpo: {
            cuadrilla_id: 1,
            tipo_actividad_id: 2,
            area_verde_id: 3,
            descripcion: 'Regar los arbustos',
            periodicidad: 'Directo',
            plazo_previsto: '2099-07-01',
          },
        }),
      ),
    )
    // El panel del encargo nuevo se abre solo y el alta se cierra.
    await waitFor(() => expect(router.state.location.search).toContain('encargo_id=9'))
    expect(router.state.location.search).not.toContain('encargo=nuevo')
    expect(router.state.location.search).not.toContain('area=')
  })

  it('un error del servidor se enseña en el formulario', async () => {
    const usuario = userEvent.setup()
    api.campoApi.mockRejectedValue(new ErrorApi(400, null, 'Ya existe un encargo igual'))
    montar(`/n/planificacion/cuadrillas${SEMANA}&encargo=nuevo&area=3`)
    const dialogo = await screen.findByRole('dialog', { name: 'Registrar encargo' })
    await usuario.selectOptions(await within(dialogo).findByLabelText(/Cuadrilla y capataz/), '1')
    await usuario.selectOptions(within(dialogo).getByLabelText(/Tipo de actividad/), '2')
    await usuario.type(within(dialogo).getByLabelText(/Descripción del encargo/), 'Podar')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar encargo' }))
    expect(await within(dialogo).findByText('Ya existe un encargo igual')).toBeTruthy()
  })
})

describe('panel del encargo', () => {
  it('?encargo_id= abre el panel con el detalle y «Editar» solo para la jefatura', async () => {
    montar(`/n/planificacion/cuadrillas${SEMANA}&encargo_id=5`)
    expect(await screen.findByRole('heading', { name: 'Encargo 5' })).toBeTruthy()
    expect(screen.getAllByText('Podar el seto').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Editar' })).toBeTruthy()
    cleanup()
    api.permisos = LECTOR
    montar(`/n/planificacion/cuadrillas${SEMANA}&encargo_id=5`)
    await screen.findByRole('heading', { name: 'Encargo 5' })
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull()
  })

  it('«Editar» abre el formulario con los datos del encargo y guarda con PUT', async () => {
    const usuario = userEvent.setup()
    montar(`/n/planificacion/cuadrillas${SEMANA}&encargo_id=5`)
    await usuario.click(await screen.findByRole('button', { name: 'Editar' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Editar encargo' })
    const descripcion = (await within(dialogo).findByLabelText(/Descripción del encargo/)) as HTMLTextAreaElement
    expect(descripcion.value).toBe('Podar el seto')
    await usuario.type(descripcion, ' hoy')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar encargo' }))
    await waitFor(() =>
      expect(api.campoApi).toHaveBeenCalledWith(
        'encargos/5/',
        expect.objectContaining({
          metodo: 'PUT',
          cuerpo: expect.objectContaining({ descripcion: 'Podar el seto hoy', periodicidad: 'Semanal' }),
        }),
      ),
    )
  })

  it('un encargo que no existe o sin acceso se explica en el panel', async () => {
    api.todosCampo.mockImplementation((ruta: string) =>
      ruta === 'cuadrillas/' ? Promise.resolve([norte]) : Promise.resolve([]),
    )
    api.campoApi.mockRejectedValue(new ErrorApi(404, null, 'No encontrado'))
    montar(`/n/planificacion/cuadrillas${SEMANA}&encargo_id=99`)
    expect(await screen.findByText('No existe este encargo')).toBeTruthy()
    cleanup()
    api.campoApi.mockRejectedValue(new ErrorApi(403, null, 'Prohibido'))
    montar(`/n/planificacion/cuadrillas${SEMANA}&encargo_id=99`)
    expect(await screen.findByText('No puedes ver este encargo')).toBeTruthy()
  })

  it('Seguimiento enseña el historial de estados y de reprogramaciones', async () => {
    montar(`/n/planificacion/cuadrillas${SEMANA}&encargo_id=5`)
    await abrirPestana('Seguimiento')
    expect(await screen.findByText('Por completar → En curso')).toBeTruthy()
    expect(screen.getByText('Empezamos por el norte')).toBeTruthy()
    expect(screen.getByText('Llovió el lunes')).toBeTruthy()
  })

  it('Seguimiento sin cambios muestra el estado vacío del historial', async () => {
    api.campoApi.mockImplementation((ruta: string) =>
      ruta === 'encargos/5/' ? Promise.resolve(podar) : Promise.resolve({}),
    )
    montar(`/n/planificacion/cuadrillas${SEMANA}&encargo_id=5`)
    await abrirPestana('Seguimiento')
    expect(await screen.findByText('Sin cambios de estado registrados.')).toBeTruthy()
    expect(screen.getByText('Sin reprogramaciones.')).toBeTruthy()
  })

  it('Seguimiento con error permite reintentar y con 403 avisa', async () => {
    api.campoApi.mockRejectedValue(new ErrorApi(500, null, 'Fallo del servidor'))
    montar(`/n/planificacion/cuadrillas${SEMANA}&encargo_id=5`)
    await abrirPestana('Seguimiento')
    expect(await screen.findByText('No pudimos cargar el seguimiento')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeTruthy()
    cleanup()
    api.campoApi.mockRejectedValue(new ErrorApi(403, null, 'Prohibido'))
    montar(`/n/planificacion/cuadrillas${SEMANA}&encargo_id=5`)
    await abrirPestana('Seguimiento')
    expect(await screen.findByText('No puedes ver el seguimiento')).toBeTruthy()
  })

  it('el capataz cambia el estado de los suyos con POST y la etiqueta se actualiza', async () => {
    api.permisos = CAPATAZ
    let estado: EncargoCampo = podar
    api.campoApi.mockImplementation((ruta: string, opciones?: { metodo?: string }) => {
      if (ruta === 'encargos/5/estado/' && opciones?.metodo === 'POST') {
        estado = { ...completo, estado: 'En curso' }
        return Promise.resolve({})
      }
      if (ruta === 'encargos/5/') return Promise.resolve(estado)
      return Promise.resolve({})
    })
    const usuario = userEvent.setup()
    montar(`/n/planificacion/cuadrillas${SEMANA}&encargo_id=5`)
    await abrirPestana('Seguimiento')
    await usuario.click(await screen.findByRole('button', { name: 'Cambiar estado' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Seguimiento del encargo' })
    await usuario.selectOptions(await within(dialogo).findByLabelText(/Nuevo estado/), 'En curso')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar estado' }))
    await waitFor(() =>
      expect(api.campoApi).toHaveBeenCalledWith(
        'encargos/5/estado/',
        expect.objectContaining({
          metodo: 'POST',
          cuerpo: { estado_anterior: 'Por completar', estado: 'En curso', observaciones: '' },
        }),
      ),
    )
    const panel =
      screen.getByRole('heading', { name: 'Encargo 5' }).closest('aside, section, div[role]') ?? document.body
    await waitFor(() => expect(within(panel as HTMLElement).getAllByText('En curso').length).toBeGreaterThan(0))
    expect(await screen.findByText('El estado del encargo se guardó correctamente.')).toBeTruthy()
  })

  it('sin permiso de cambiar estado no hay «Cambiar estado»', async () => {
    api.permisos = LECTOR
    montar(`/n/planificacion/cuadrillas${SEMANA}&encargo_id=5`)
    await abrirPestana('Seguimiento')
    await screen.findByText('Por completar → En curso')
    expect(screen.queryByRole('button', { name: 'Cambiar estado' })).toBeNull()
  })

  it('un encargo completado ya no ofrece cambiar el estado', async () => {
    api.permisos = JEFE
    const cerrado = { ...completo, estado: 'Completado' as const }
    api.todosCampo.mockImplementation((ruta: string) =>
      ruta === 'cuadrillas/' ? Promise.resolve([norte]) : Promise.resolve([cerrado]),
    )
    api.campoApi.mockImplementation((ruta: string) =>
      ruta === 'encargos/5/' ? Promise.resolve(cerrado) : Promise.resolve({}),
    )
    montar(`/n/planificacion/cuadrillas${SEMANA}&encargo_id=5`)
    await abrirPestana('Seguimiento')
    await screen.findByText('Por completar → En curso')
    expect(screen.queryByRole('button', { name: 'Cambiar estado' })).toBeNull()
  })

  it('Actividades lista las del encargo y avisa cuando no hay ninguna', async () => {
    montar(`/n/planificacion/cuadrillas${SEMANA}&encargo_id=5`)
    await abrirPestana('Actividades')
    expect(await screen.findByText('Sin actividades registradas')).toBeTruthy()
    expect(api.campoApi).toHaveBeenCalledWith(
      'actividades/',
      expect.objectContaining({ parametros: { encargo_id: 5 } }),
    )
    cleanup()
    api.campoApi.mockImplementation((ruta: string) =>
      ruta === 'actividades/'
        ? Promise.resolve({
            count: 1,
            next: null,
            previous: null,
            results: [
              {
                id: 30,
                tipo_actividad_nombre: 'Poda',
                area_verde_nombre: 'Jardín A',
                fecha_hora_actividad: '2099-06-02T09:00:00-05:00',
                estado_actividad: 'Verificada',
                observaciones: 'Sin novedades',
              },
            ],
          })
        : Promise.resolve({}),
    )
    montar(`/n/planificacion/cuadrillas${SEMANA}&encargo_id=5`)
    await abrirPestana('Actividades')
    expect(await screen.findByText('Sin novedades')).toBeTruthy()
    expect(screen.getByText('Verificada')).toBeTruthy()
  })

  it('Actividades con error o sin acceso lo dice', async () => {
    api.campoApi.mockImplementation((ruta: string) =>
      ruta === 'actividades/' ? Promise.reject(new ErrorApi(403, null, 'Prohibido')) : Promise.resolve({}),
    )
    montar(`/n/planificacion/cuadrillas${SEMANA}&encargo_id=5`)
    await abrirPestana('Actividades')
    expect(await screen.findByText('No puedes ver las actividades')).toBeTruthy()
  })

  it('sin permiso de partes no hay pestaña Actividades', async () => {
    api.permisos = LECTOR
    montar(`/n/planificacion/cuadrillas${SEMANA}&encargo_id=5`)
    await screen.findByRole('tab', { name: 'Seguimiento' })
    expect(screen.queryByRole('tab', { name: 'Actividades' })).toBeNull()
  })
})
