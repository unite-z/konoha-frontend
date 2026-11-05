// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import IntervencionPodaPage from './IntervencionPodaPage'
import RegistrarPodaPage from './RegistrarPodaPage'

const CAMPANA = { id: 5, nombre: 'Cierre 2026-2027', estado: 'EnEjecucion', fecha_inicio: '2026-12-20', fecha_fin: '2026-12-29' }
const INTERVENCION = {
  id: 9,
  ejemplar_id: 3,
  ejemplar_codigo: 'EJ-0003',
  categoria: 'MayorCampana',
  campana_id: 5,
  atencion_id: null,
  incidencia_id: null,
  tipo_intervencion_id: 2,
  tipo_intervencion_nombre: 'Poda de limpieza',
  fecha_ejecucion: '2026-12-21',
  reduccion_copa_pct: '15.50',
  ramas_laterales_cortadas: 3,
  cantidad_solicitada: '4.00',
  cantidad_ejecutada: '3.00',
  unidad_medida_id: 7,
  unidad_medida_simbolo: 'rama',
  prioridad: 'Alta',
  estado: 'Incompleta',
}

const api = vi.hoisted(() => ({
  consultarCatalogosPoda: vi.fn(),
  listarIncidenciasEjemplar: vi.fn(),
  obtenerIntervencion: vi.fn(),
  crearIntervencion: vi.fn(),
  anularIntervencion: vi.fn(),
  obtenerCampana: vi.fn(),
  listarTodosEjemplaresCampana: vi.fn(),
  subirAdjunto: vi.fn(),
}))
const permiso = vi.hoisted(() => ({ registrar: true }))

vi.mock('@/services/api/intervencionesPoda', () => ({
  consultarCatalogosPoda: api.consultarCatalogosPoda,
  listarIncidenciasEjemplar: api.listarIncidenciasEjemplar,
  obtenerIntervencion: api.obtenerIntervencion,
  crearIntervencion: api.crearIntervencion,
  anularIntervencion: api.anularIntervencion,
}))
vi.mock('@/services/api/campanasPoda', () => ({
  obtenerCampana: api.obtenerCampana,
  listarTodosEjemplaresCampana: api.listarTodosEjemplaresCampana,
}))
vi.mock('@/services/api/core', () => ({ subirAdjunto: api.subirAdjunto }))
vi.mock('@/components/core/Adjuntos', () => ({
  default: ({ onCambio }: { onCambio?: () => void }) => <button type="button" onClick={onCambio}>Simular foto</button>,
}))
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))
vi.mock('@/sesion/ContextoSesion', () => ({ useSesionActiva: () => ({ usuario: { id: 7 } }) }))
vi.mock('@/config/permisosCore', () => ({ PERMISOS: { registrarPoda: 'registrar' }, puede: () => permiso.registrar }))

// jsdom no implementa showModal ni close.
HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
  this.setAttribute('open', '')
}
HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
  this.removeAttribute('open')
}

function pagina(ruta: string | { pathname: string; state: unknown }) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/areas-verdes/campanas-poda/:id" element={<p>Ficha de campaña</p>} />
        <Route path="/areas-verdes/campanas-poda/:id/registrar" element={<RegistrarPodaPage />} />
        <Route path="/areas-verdes/intervenciones-poda/:id" element={<IntervencionPodaPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function completarObligatorios() {
  fireEvent.change(await screen.findByRole('combobox', { name: /^Ejemplar/ }), { target: { value: '3' } })
  fireEvent.change(screen.getByLabelText(/^Tipo de poda/), { target: { value: '2' } })
  fireEvent.change(screen.getByLabelText(/^Fecha ejecutada/), { target: { value: '2026-12-21' } })
}

beforeEach(() => {
  permiso.registrar = true
  api.obtenerCampana.mockResolvedValue(CAMPANA)
  api.listarTodosEjemplaresCampana.mockResolvedValue([{ id: 3, codigo: 'EJ-0003', especie_nombre_comun: 'Molle' }])
  api.consultarCatalogosPoda.mockResolvedValue({ tipos: [{ id: 2, nombre: 'Poda de limpieza' }], unidades: [{ id: 7, nombre: 'Rama' }] })
  api.listarIncidenciasEjemplar.mockResolvedValue([{ id: 11, nombre: 'OSG-0478' }])
  api.crearIntervencion.mockResolvedValue(INTERVENCION)
  api.obtenerIntervencion.mockResolvedValue(INTERVENCION)
  api.subirAdjunto.mockResolvedValue({})
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('RegistrarPodaPage', () => {
  it('guarda sin foto como incompleta, con cantidades, unidad e incidencia', async () => {
    pagina('/areas-verdes/campanas-poda/5/registrar')
    await completarObligatorios()
    fireEvent.change(screen.getByLabelText(/^Cantidad solicitada/), { target: { value: '4' } })

    fireEvent.click(screen.getByRole('button', { name: 'Guardar incompleta' }))
    expect(screen.getByText('Indica la unidad de las cantidades.')).toBeTruthy()
    expect(api.crearIntervencion).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText(/^Unidad/), { target: { value: '7' } })
    fireEvent.change(screen.getByLabelText(/^Prioridad/), { target: { value: 'Alta' } })
    await screen.findByRole('option', { name: 'OSG-0478' })
    fireEvent.change(screen.getByLabelText(/^Incidencia de origen/), { target: { value: '11' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar incompleta' }))

    await waitFor(() => expect(api.crearIntervencion).toHaveBeenCalled())
    expect(api.crearIntervencion.mock.calls[0][0]).toMatchObject({
      ejemplar_id: 3,
      campana_id: 5,
      tipo_intervencion_id: 2,
      fecha_ejecucion: '2026-12-21',
      cantidad_solicitada: '4',
      unidad_medida_id: 7,
      prioridad: 'Alta',
      incidencia_id: 11,
    })
    expect(api.subirAdjunto).not.toHaveBeenCalled()
    expect(await screen.findByText('Falta la fotografía de evidencia')).toBeTruthy()
  })

  it('con foto la sube a la intervención creada', async () => {
    pagina('/areas-verdes/campanas-poda/5/registrar')
    await completarObligatorios()
    const archivo = new File(['x'], 'poda.png', { type: 'image/png' })
    const entrada = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(entrada, { target: { files: [archivo] } })

    fireEvent.click(await screen.findByRole('button', { name: 'Guardar intervención' }))

    await waitFor(() => expect(api.subirAdjunto).toHaveBeenCalled())
    expect(api.subirAdjunto.mock.calls[0].slice(0, 3)).toEqual(['intervencion', 9, archivo])
  })

  it('si falla la foto no pierde el registro y lo avisa en la ficha', async () => {
    api.subirAdjunto.mockRejectedValueOnce(new ErrorApi(413, 'archivo-grande', 'El archivo supera 20 MB.'))
    pagina('/areas-verdes/campanas-poda/5/registrar')
    await completarObligatorios()
    const entrada = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(entrada, { target: { files: [new File(['x'], 'poda.png', { type: 'image/png' })] } })
    fireEvent.click(await screen.findByRole('button', { name: 'Guardar intervención' }))

    expect(await screen.findByText('La intervención se guardó, pero no la fotografía')).toBeTruthy()
    expect(api.crearIntervencion).toHaveBeenCalledTimes(1)
  })

  it('muestra el error del servidor', async () => {
    api.crearIntervencion.mockRejectedValueOnce(new ErrorApi(400, 'fecha-fuera-de-periodo', 'La fecha debe estar dentro del periodo de la campaña'))
    pagina('/areas-verdes/campanas-poda/5/registrar')
    await completarObligatorios()
    fireEvent.click(screen.getByRole('button', { name: 'Guardar incompleta' }))

    expect(await screen.findByText('La fecha debe estar dentro del periodo de la campaña')).toBeTruthy()
  })

  it('no deja registrar si la campaña no está en ejecución', async () => {
    api.obtenerCampana.mockResolvedValue({ ...CAMPANA, estado: 'Planificada' })
    pagina('/areas-verdes/campanas-poda/5/registrar')

    expect(await screen.findByText('La campaña no está en ejecución')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Guardar incompleta' })).toBeNull()
  })

  it('niega el acceso a quien no registra', () => {
    permiso.registrar = false
    pagina('/areas-verdes/campanas-poda/5/registrar')
    expect(screen.getByText('Solo el ingeniero de campo puede registrar la poda.')).toBeTruthy()
  })
})

describe('IntervencionPodaPage', () => {
  it('muestra los datos y se actualiza a verificada al añadir la foto', async () => {
    pagina('/areas-verdes/intervenciones-poda/9')
    expect(await screen.findByText('Falta la fotografía de evidencia')).toBeTruthy()
    expect(screen.getByText('15.50 %')).toBeTruthy()
    expect(screen.getByText('3.00 rama')).toBeTruthy()

    api.obtenerIntervencion.mockResolvedValue({ ...INTERVENCION, estado: 'Verificada' })
    fireEvent.click(screen.getByRole('button', { name: 'Simular foto' }))

    expect(await screen.findByText('Intervención verificada')).toBeTruthy()
  })

  it('anula el registro y vuelve a la campaña', async () => {
    api.anularIntervencion.mockResolvedValue(undefined)
    pagina('/areas-verdes/intervenciones-poda/9')
    fireEvent.click(await screen.findByRole('button', { name: 'Anular registro' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Anular' }))

    await waitFor(() => expect(api.anularIntervencion).toHaveBeenCalledWith(9))
    expect(await screen.findByText('Ficha de campaña')).toBeTruthy()
  })

  it('oculta anular a quien solo consulta', async () => {
    permiso.registrar = false
    pagina('/areas-verdes/intervenciones-poda/9')
    await screen.findByText('Falta la fotografía de evidencia')
    expect(screen.queryByRole('button', { name: 'Anular registro' })).toBeNull()
  })
})
