// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import type { CuadrillaCampo, EncargoCampo } from '@/types/operacionCampo'
import CuadrillasPage from './CuadrillasPage'

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

const JEFE = ['CAM.CUADRILLA.CONSULTAR', 'CAM.CUADRILLA.GESTIONAR']
const CAPATAZ = ['CAM.CUADRILLA.CONSULTAR', 'CAM.PARTE.REGISTRAR']
const SEMANA = '/n/planificacion/cuadrillas?semana=2099-06-01'

function cuadrilla(id: number, nombre: string): CuadrillaCampo {
  return {
    id,
    nombre,
    capataz_id: id,
    capataz_nombre: `Capataz ${nombre}`,
    activa: true,
    operarios: [],
    cantidad_operarios: 0,
  }
}
const norte = cuadrilla(1, 'Norte')
const sur = cuadrilla(2, 'Sur')

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

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close ??= function () {
    this.open = false
  }
})

beforeEach(() => {
  api.permisos = JEFE
  api.listarCuadrillasCampo.mockResolvedValue([norte, sur])
  api.todosCampo.mockResolvedValue([podar])
  api.campoApi.mockResolvedValue({})
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function montar(ruta = SEMANA) {
  const router = createMemoryRouter([{ path: '/n/planificacion/cuadrillas', Component: CuadrillasPage }], {
    initialEntries: [ruta],
  })
  render(<RouterProvider router={router} />)
  return router
}

const tarjeta = () => screen.findByRole('button', { name: /Encargo 5: Podar el seto/ })

describe('CuadrillasPage', () => {
  it('sin permiso de consulta muestra el estado sin acceso y no pide datos', () => {
    api.permisos = []
    montar()
    expect(screen.getByText('No puedes ver las cuadrillas')).toBeTruthy()
    expect(api.todosCampo).not.toHaveBeenCalled()
  })

  it('pinta una fila por cuadrilla con sus encargos de la semana', async () => {
    montar()
    await tarjeta()
    expect(screen.getByRole('group', { name: 'Cuadrilla Norte' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Cuadrilla Sur' })).toBeTruthy()
    expect(within(screen.getByRole('group', { name: 'Cuadrilla Norte' })).getByText('Podar el seto')).toBeTruthy()
    expect(api.todosCampo).toHaveBeenCalledWith(
      'encargos/',
      { desde: '2099-06-01', hasta: '2099-06-07' },
      expect.anything(),
    )
  })

  it('muestra el estado vacío cuando la semana no tiene encargos', async () => {
    api.todosCampo.mockResolvedValue([])
    montar()
    expect(await screen.findByText('No hay encargos esta semana')).toBeTruthy()
  })

  it('muestra el error con reintento y el estado sin acceso del servidor', async () => {
    api.todosCampo.mockRejectedValueOnce(new ErrorApi(500, null, 'Fallo del servidor'))
    montar()
    expect(await screen.findByText('No pudimos cargar el calendario')).toBeTruthy()
    expect(screen.getByText('Fallo del servidor')).toBeTruthy()
    cleanup()
    api.todosCampo.mockRejectedValueOnce(new ErrorApi(403, null, 'Prohibido'))
    montar()
    expect(await screen.findByText('No puedes ver el calendario')).toBeTruthy()
  })

  it('con Alt y flecha abre la reprogramación y exige la justificación', async () => {
    const usuario = userEvent.setup()
    montar()
    const boton = await tarjeta()
    boton.focus()
    await usuario.keyboard('{Alt>}{ArrowRight}{/Alt}')
    const dialogo = await screen.findByRole('dialog', { name: /Reprogramar encargo/ })
    expect((within(dialogo).getByLabelText(/Inicio del periodo/) as HTMLInputElement).value).toBe('2099-06-03')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Reprogramar' }))
    expect(api.campoApi).not.toHaveBeenCalled()
    await usuario.type(within(dialogo).getByLabelText(/Justificación/), 'Llueve el martes')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Reprogramar' }))
    await waitFor(() =>
      expect(api.campoApi).toHaveBeenCalledWith(
        'encargos/5/reprogramacion/',
        expect.objectContaining({
          metodo: 'POST',
          cuerpo: expect.objectContaining({
            fecha_inicio: '2099-06-03',
            fecha_fin: '2099-06-05',
            justificacion: 'Llueve el martes',
          }),
        }),
      ),
    )
  })

  it('al cambiar de cuadrilla pide confirmación y usa PUT', async () => {
    const usuario = userEvent.setup()
    montar()
    const boton = await tarjeta()
    boton.focus()
    await usuario.keyboard('{Alt>}{ArrowDown}{/Alt}')
    const dialogo = await screen.findByRole('dialog', { name: /Pasar el encargo a Sur/ })
    expect(api.campoApi).not.toHaveBeenCalled()
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cambiar de cuadrilla' }))
    await waitFor(() =>
      expect(api.campoApi).toHaveBeenCalledWith(
        'encargos/5/',
        expect.objectContaining({ metodo: 'PUT', cuerpo: expect.objectContaining({ cuadrilla_id: 2 }) }),
      ),
    )
  })

  it('al arrastrar a otro día abre la reprogramación', async () => {
    montar()
    const boton = await tarjeta()
    const celdas = Array.from(document.querySelectorAll<HTMLElement>('[data-dia][data-cuadrilla="1"]'))
    const origen = celdas.find((c) => c.dataset.dia === '2099-06-02')
    const destino = celdas.find((c) => c.dataset.dia === '2099-06-05')
    if (!origen || !destino) throw new Error('faltan celdas')
    let bajo = origen
    document.elementsFromPoint = () => [bajo]
    const tarjetaArrastrable = boton.closest('article') as HTMLElement
    fireEvent.pointerDown(tarjetaArrastrable, { clientX: 10, clientY: 10, pointerId: 1, button: 0 })
    fireEvent.pointerMove(tarjetaArrastrable, { clientX: 200, clientY: 10, pointerId: 1 })
    expect(tarjetaArrastrable.style.transform).toContain('translate3d')
    bajo = destino
    fireEvent.pointerUp(tarjetaArrastrable, { clientX: 200, clientY: 10, pointerId: 1 })
    const dialogo = await screen.findByRole('dialog', { name: /Reprogramar encargo/ })
    expect((within(dialogo).getByLabelText(/Inicio del periodo/) as HTMLInputElement).value).toBe('2099-06-05')
  })

  it('el capataz ve su cuadrilla en lectura: no puede arrastrar ni mover', async () => {
    api.permisos = CAPATAZ
    const usuario = userEvent.setup()
    montar()
    const boton = await tarjeta()
    expect(boton.closest('article')?.hasAttribute('data-movible')).toBe(false)
    boton.focus()
    await usuario.keyboard('{Alt>}{ArrowRight}{/Alt}')
    expect(screen.queryByRole('dialog')).toBeNull()
    await usuario.click(boton)
    expect(await screen.findByRole('heading', { name: 'Encargo 5' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Mover' })).toBeNull()
  })

  it('el botón Mover del panel es la alternativa al arrastre', async () => {
    const usuario = userEvent.setup()
    const router = montar()
    await usuario.click(await tarjeta())
    expect(router.state.location.search).toContain('encargo_id=5')
    const mover = await screen.findByRole('button', { name: 'Mover' })
    expect(mover.getAttribute('aria-disabled')).toBe('true')
    fireEvent.change(screen.getByLabelText('Nuevo día de inicio'), { target: { value: '2099-06-03' } })
    await usuario.click(screen.getByRole('button', { name: 'Mover' }))
    const dialogo = await screen.findByRole('dialog', { name: /Reprogramar encargo/ })
    expect((within(dialogo).getByLabelText(/Inicio del periodo/) as HTMLInputElement).value).toBe('2099-06-03')
  })

  it('la lista conserva sus filtros en la URL', async () => {
    const usuario = userEvent.setup()
    api.campoApi.mockResolvedValue({ count: 1, results: [podar], next: null, previous: null })
    const router = montar('/n/planificacion/cuadrillas?vista=lista')
    expect(await screen.findByText('Podar el seto')).toBeTruthy()
    await usuario.selectOptions(screen.getByLabelText('Modalidad'), 'Semanal')
    await usuario.selectOptions(screen.getByLabelText('Vencimiento'), 'true')
    await waitFor(() => expect(router.state.location.search).toContain('periodicidad=Semanal'))
    expect(router.state.location.search).toContain('vencidos=true')
    expect(router.state.location.search).toContain('vista=lista')
    await waitFor(() =>
      expect(api.campoApi).toHaveBeenLastCalledWith(
        'encargos/',
        expect.objectContaining({ parametros: expect.objectContaining({ periodicidad: 'Semanal', vencidos: 'true' }) }),
      ),
    )
  })

  it('la lista conserva la búsqueda de la pantalla actual en la URL', async () => {
    const usuario = userEvent.setup()
    api.campoApi.mockResolvedValue({ count: 1, results: [podar], next: null, previous: null })
    const router = montar('/n/planificacion/cuadrillas?vista=lista')
    await screen.findByText('Podar el seto')
    await usuario.type(screen.getByLabelText('Buscar'), 'seto')
    await usuario.click(screen.getByRole('button', { name: 'Buscar' }))
    await waitFor(() => expect(router.state.location.search).toContain('q=seto'))
    expect(api.campoApi).toHaveBeenLastCalledWith(
      'encargos/',
      expect.objectContaining({ parametros: expect.objectContaining({ q: 'seto' }) }),
    )
  })

  it('el panel enlaza con la incidencia de origen solo con los permisos de la pantalla actual', async () => {
    api.todosCampo.mockResolvedValue([{ ...podar, incidencia_origen_id: 77 }])
    api.permisos = [...JEFE, 'PLA.PLANIFICACION.CONSULTAR', 'PLA.INCIDENCIA.REGISTRAR']
    montar(`${SEMANA}&encargo_id=5`)
    const enlace = await screen.findByRole('link', { name: /Ver incidencia de origen/ })
    expect(enlace.getAttribute('href')).toMatch(/\/77$/)
    cleanup()
    api.permisos = JEFE
    montar(`${SEMANA}&encargo_id=5`)
    await screen.findByRole('heading', { name: 'Encargo 5' })
    expect(screen.queryByRole('link', { name: /Ver incidencia de origen/ })).toBeNull()
  })

  it('la lista sin resultados ofrece limpiar los filtros', async () => {
    api.campoApi.mockResolvedValue({ count: 0, results: [], next: null, previous: null })
    montar('/n/planificacion/cuadrillas?vista=lista&periodicidad=Directo')
    expect(await screen.findByText('No hay encargos con estos filtros')).toBeTruthy()
  })
})
