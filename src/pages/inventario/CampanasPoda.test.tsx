// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import CampanaPodaDetallePage from './CampanaPodaDetallePage'
import CampanasPodaPage from './CampanasPodaPage'
import PlanificarCampanaPage from './PlanificarCampanaPage'

const CAMPANA = {
  id: 5,
  anio: 2026,
  nombre: 'Cierre 2026-2027',
  clase: 'Anual',
  motivo_extraordinaria: null,
  fecha_inicio: '2026-12-20',
  fecha_fin: '2026-12-29',
  objetivo_diario: 12,
  estado: 'Planificada',
  atencion_id: null,
  total_ejemplares: 220,
  capacidad: { dias: 10, estimada: 120, requerido_por_dia: '22.00', excedida: true },
  avance: { verificables: 180, incompletos: 1, porcentaje: '81.8' },
}

const api = vi.hoisted(() => ({
  listarCampanas: vi.fn(),
  obtenerCampana: vi.fn(),
  crearCampana: vi.fn(),
  cambiarCampana: vi.fn(),
  retirarCampana: vi.fn(),
  listarEjemplaresCampana: vi.fn(),
  listarTodosEjemplaresCampana: vi.fn(),
  consultarVentanaCierre: vi.fn(),
  planificarCampana: vi.fn(),
  iniciarCampana: vi.fn(),
  finalizarCampana: vi.fn(),
}))
const permiso = vi.hoisted(() => ({ planificar: true, registrar: false }))

vi.mock('@/services/api/campanasPoda', () => api)
vi.mock('@/services/api/ejemplares', () => ({
  listarEjemplares: async () => [{ id: 3, codigo: 'EJ-0003', especie_nombre_comun: 'Molle', referencia_catastro: 'CAT-1' }],
}))
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))
vi.mock('@/sesion/ContextoSesion', () => ({ useSesionActiva: () => ({ usuario: { id: 7 } }) }))
vi.mock('@/config/permisosCore', () => ({ PERMISOS: { planificarPoda: 'planificar', registrarPoda: 'registrar' }, puede: (_sesion: unknown, codigo: string) => (codigo === 'registrar' ? permiso.registrar : permiso.planificar) }))
vi.mock('@/layouts/LayoutOficina/AccionesPagina', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))

function pagina(ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/areas-verdes/campanas-poda" element={<CampanasPodaPage />} />
        <Route path="/areas-verdes/campanas-poda/nueva" element={<PlanificarCampanaPage />} />
        <Route path="/areas-verdes/campanas-poda/:id" element={<CampanaPodaDetallePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  permiso.planificar = true
  api.listarCampanas.mockResolvedValue({ count: 1, next: null, previous: null, results: [CAMPANA] })
  api.obtenerCampana.mockResolvedValue(CAMPANA)
  api.listarEjemplaresCampana.mockResolvedValue({ count: 1, next: null, previous: null, results: [{ id: 3, codigo: 'EJ-0003', referencia_catastro: 'CAT-1', codigo_placa_antigua: null, especie_nombre_comun: 'Molle', ubicacion: null, area_verde_id: null }] })
  api.consultarVentanaCierre.mockResolvedValue({ anio: 2026, fecha_inicio: '2026-12-20', fecha_fin: '2027-01-19', duracion_maxima_dias: 10 })
  api.crearCampana.mockResolvedValue(CAMPANA)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('CampanasPodaPage', () => {
  it('lista las campañas y ofrece planificar al jefe', async () => {
    pagina('/areas-verdes/campanas-poda')
    expect(await screen.findByText('Cierre 2026-2027')).toBeTruthy()
    expect(screen.getByText('Planificada')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Planificar campaña' })).toBeTruthy()
  })

  it('oculta planificar a quien solo consulta', async () => {
    permiso.planificar = false
    pagina('/areas-verdes/campanas-poda')
    await screen.findByText('Cierre 2026-2027')
    expect(screen.queryByRole('button', { name: 'Planificar campaña' })).toBeNull()
  })

  it('muestra el vacío y el 403', async () => {
    api.listarCampanas.mockResolvedValueOnce({ count: 0, next: null, previous: null, results: [] })
    pagina('/areas-verdes/campanas-poda')
    expect(await screen.findByText('Aún no hay campañas')).toBeTruthy()
    cleanup()

    api.listarCampanas.mockRejectedValueOnce(new ErrorApi(403, 'sin-permiso', 'Sin permiso para campañas'))
    pagina('/areas-verdes/campanas-poda')
    expect(await screen.findByText('Sin permiso para campañas')).toBeTruthy()
  })
})

describe('PlanificarCampanaPage', () => {
  it('precarga el cierre, calcula la capacidad y crea la campaña con los elegidos', async () => {
    pagina('/areas-verdes/campanas-poda/nueva')
    await waitFor(() => expect((screen.getByLabelText(/^Fin/) as HTMLInputElement).value).toBe('2026-12-29'))

    fireEvent.click(await screen.findByRole('checkbox', { name: /EJ-0003 · Molle/ }))
    expect(screen.getByText(/1 seleccionados · 10 días · 0.10 al día · capacidad de 120/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Crear campaña' }))
    await waitFor(() => expect(api.crearCampana).toHaveBeenCalled())
    expect(api.crearCampana.mock.calls[0][0]).toMatchObject({
      clase: 'Anual',
      estado: 'Planificada',
      fecha_inicio: '2026-12-20',
      fecha_fin: '2026-12-29',
      objetivo_diario: 12,
      ejemplar_ids: [3],
    })
  })

  it('una segunda campaña pide motivo y se envía como extraordinaria', async () => {
    api.crearCampana.mockRejectedValueOnce(new ErrorApi(409, 'campana-anual-existente', 'Ya existe una campaña anual en 2026'))
    pagina('/areas-verdes/campanas-poda/nueva')
    await waitFor(() => expect((screen.getByLabelText(/^Fin/) as HTMLInputElement).value).toBe('2026-12-29'))

    fireEvent.click(screen.getByRole('button', { name: 'Crear campaña' }))
    fireEvent.change(await screen.findByLabelText(/Motivo extraordinario/), { target: { value: 'Atención urgente por riesgo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar extraordinaria' }))

    await waitFor(() => expect(api.crearCampana).toHaveBeenCalledTimes(2))
    expect(api.crearCampana.mock.calls[1][0]).toMatchObject({ clase: 'Extraordinaria', motivo_extraordinaria: 'Atención urgente por riesgo' })
  })

  it('un borrador que resulta ser la segunda campaña sigue siendo borrador', async () => {
    api.crearCampana.mockRejectedValueOnce(new ErrorApi(409, 'campana-anual-existente', 'Ya existe una campaña anual en 2026'))
    pagina('/areas-verdes/campanas-poda/nueva')
    await waitFor(() => expect((screen.getByLabelText(/^Fin/) as HTMLInputElement).value).toBe('2026-12-29'))

    fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }))
    fireEvent.change(await screen.findByLabelText(/Motivo extraordinario/), { target: { value: 'Riesgo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar extraordinaria' }))

    await waitFor(() => expect(api.crearCampana).toHaveBeenCalledTimes(2))
    expect(api.crearCampana.mock.calls[1][0]).toMatchObject({ clase: 'Extraordinaria', estado: 'Borrador' })
  })

  it('avisa si el cierre no está registrado y deja escribir las fechas', async () => {
    api.consultarVentanaCierre.mockRejectedValueOnce(new ErrorApi(409, 'cierre-no-registrado', 'Registra el cierre del campus de 2026'))
    pagina('/areas-verdes/campanas-poda/nueva')
    expect(await screen.findByText('Registra el cierre del campus de 2026')).toBeTruthy()
    expect((screen.getByLabelText(/^Inicio/) as HTMLInputElement).disabled).toBe(false)
  })

  it('muestra el error del servidor al rechazar el periodo', async () => {
    api.crearCampana.mockRejectedValueOnce(new ErrorApi(400, 'campana-duracion-excedida', 'La campaña no puede durar más de 10 días'))
    pagina('/areas-verdes/campanas-poda/nueva')
    await waitFor(() => expect((screen.getByLabelText(/^Fin/) as HTMLInputElement).value).toBe('2026-12-29'))

    fireEvent.click(screen.getByRole('button', { name: 'Crear campaña' }))
    expect(await screen.findByText('La campaña no puede durar más de 10 días')).toBeTruthy()
  })

  it('niega el acceso a quien no planifica', () => {
    permiso.planificar = false
    pagina('/areas-verdes/campanas-poda/nueva')
    expect(screen.getByText('Solo el jefe de sección puede planificar la campaña.')).toBeTruthy()
  })
})

describe('CampanaPodaDetallePage', () => {
  it('muestra la capacidad excedida y autoriza la ejecución', async () => {
    api.iniciarCampana.mockResolvedValue({ ...CAMPANA, estado: 'EnEjecucion' })
    pagina('/areas-verdes/campanas-poda/5')

    expect(await screen.findByText('Revisar capacidad')).toBeTruthy()
    expect(await screen.findByText('CAT-1')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Autorizar ejecución' }))

    await waitFor(() => expect(api.iniciarCampana).toHaveBeenCalledWith(5))
    expect(await screen.findByText('Ejecución autorizada.')).toBeTruthy()
  })

  it('una campaña en ejecución no se edita ni se retira', async () => {
    api.obtenerCampana.mockResolvedValue({ ...CAMPANA, estado: 'EnEjecucion' })
    pagina('/areas-verdes/campanas-poda/5')

    expect(await screen.findByRole('button', { name: 'Finalizar campaña' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Retirar campaña' })).toBeNull()
  })
})
