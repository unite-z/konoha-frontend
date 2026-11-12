// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import IntervencionPodaPage from './IntervencionPodaPage'
import SolicitarPodaAlturaPage from './SolicitarPodaAlturaPage'

/** Poda de altura a demanda (AV-312): solicitud y ficha de la intervención solicitada. */

const ALTO = { id: 3, codigo: 'EJ-0003', especie_nombre_comun: 'Molle', ubicacion: 'Jardín Central', altura_total_m: '8.00', requiere_justificacion: false }
const BAJO = { ...ALTO, id: 4, codigo: 'EJ-0004', altura_total_m: '4.00', requiere_justificacion: true }
const SOLICITADA = {
  id: 21,
  ejemplar_id: 3,
  ejemplar_codigo: 'EJ-0003',
  categoria: 'AlturaDemanda',
  campana_id: null,
  atencion_id: 40,
  incidencia_id: null,
  tipo_intervencion_id: null,
  tipo_intervencion_nombre: null,
  fecha_ejecucion: null,
  reduccion_copa_pct: null,
  ramas_laterales_cortadas: null,
  cantidad_solicitada: null,
  cantidad_ejecutada: null,
  unidad_medida_id: null,
  unidad_medida_simbolo: null,
  prioridad: 'Alta',
  estado: 'Solicitada',
  motivo: 'Riesgo',
  altura_referencia_m: '8.00',
  justificacion: null,
  atencion_codigo: 'AT-1234',
  atencion_estado: 'Requerimiento',
}

const api = vi.hoisted(() => ({
  listarEjemplares: vi.fn(),
  listarTiposIntervencion: vi.fn(),
  listarContratosPodaAltura: vi.fn(),
  consultarEjemplarPodaAltura: vi.fn(),
  listarIncidenciasEjemplar: vi.fn(),
  solicitarPodaAltura: vi.fn(),
  obtenerIntervencion: vi.fn(),
  cambiarIntervencion: vi.fn(),
  anularIntervencion: vi.fn(),
}))
const permiso = vi.hoisted(() => ({ planificar: true, registrar: true }))

vi.mock('@/services/api/ejemplares', () => ({ listarEjemplares: api.listarEjemplares }))
vi.mock('@/services/api/catalogosInventario', () => ({ listarTiposIntervencion: api.listarTiposIntervencion }))
vi.mock('@/services/api/intervencionesPoda', () => ({
  listarContratosPodaAltura: api.listarContratosPodaAltura,
  consultarEjemplarPodaAltura: api.consultarEjemplarPodaAltura,
  listarIncidenciasEjemplar: api.listarIncidenciasEjemplar,
  solicitarPodaAltura: api.solicitarPodaAltura,
  obtenerIntervencion: api.obtenerIntervencion,
  cambiarIntervencion: api.cambiarIntervencion,
  anularIntervencion: api.anularIntervencion,
}))
vi.mock('@/components/core/Adjuntos', () => ({ default: () => <p>Evidencias</p> }))
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))
vi.mock('@/sesion/ContextoSesion', () => ({ useSesionActiva: () => ({ usuario: { id: 7 } }) }))
vi.mock('@/config/permisosCore', () => ({
  PERMISOS: { planificarPoda: 'planificar', registrarPoda: 'registrar' },
  puede: (_sesion: unknown, codigo: string) => (codigo === 'planificar' ? permiso.planificar : permiso.registrar),
}))

function pagina(ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/areas-verdes/poda-altura" element={<SolicitarPodaAlturaPage />} />
        <Route path="/areas-verdes/intervenciones-poda/:id" element={<IntervencionPodaPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

function elegir(id: string, valor: string) {
  fireEvent.change(document.getElementById(id) as HTMLSelectElement, { target: { value: valor } })
}

beforeEach(() => {
  permiso.planificar = true
  permiso.registrar = true
  api.listarEjemplares.mockResolvedValue([ALTO, BAJO])
  api.listarTiposIntervencion.mockResolvedValue([{ id: 3, nombre: 'Reducción de copa', descripcion: null, es_poda: true, activo: true, usos: 0 }])
  api.listarContratosPodaAltura.mockResolvedValue([{ id: 11, numero: 'C-2026-01', proveedor: 'Arbolistas del Sur', servicio: 'Poda de altura', es_riesgo: false, vigencia_fin: '2027-06-30' }])
  api.listarIncidenciasEjemplar.mockResolvedValue([{ id: 8, nombre: 'INC-0008' }])
  api.consultarEjemplarPodaAltura.mockImplementation((id: number) => Promise.resolve(id === BAJO.id ? BAJO : ALTO))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('SolicitarPodaAlturaPage', () => {
  it('solicita la poda de un ejemplar de 8 m con su motivo y abre la intervención', async () => {
    api.solicitarPodaAltura.mockResolvedValue(SOLICITADA)
    api.obtenerIntervencion.mockResolvedValue(SOLICITADA)
    pagina('/areas-verdes/poda-altura?ejemplar=3')

    expect(await screen.findByText('Mide 8.00 m: poda de altura mediante proveedor.')).toBeTruthy()
    await screen.findByRole('option', { name: /Arbolistas del Sur/ })
    elegir('motivo-altura', 'Riesgo')
    expect(screen.getByText('Atención de riesgo')).toBeTruthy()
    elegir('contrato-altura', '11')
    elegir('prioridad-altura', 'Alta')
    fireEvent.change(screen.getByLabelText(/Descripción/), { target: { value: 'Rama sobre la vereda' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear atención' }))

    await waitFor(() => expect(api.solicitarPodaAltura).toHaveBeenCalledWith({
      ejemplar_id: 3,
      motivo: 'Riesgo',
      contrato_id: 11,
      descripcion: 'Rama sobre la vereda',
      tipo_intervencion_id: null,
      prioridad: 'Alta',
      incidencia_id: null,
      justificacion: null,
    }))
    expect(await screen.findByText('Poda solicitada al proveedor')).toBeTruthy()
  })

  it('por debajo de 5 m pide la justificación antes de crear la atención', async () => {
    pagina('/areas-verdes/poda-altura?ejemplar=4')

    expect(await screen.findByText(/corresponde poda menor con personal propio/)).toBeTruthy()
    await screen.findByRole('option', { name: /Arbolistas del Sur/ })
    elegir('motivo-altura', 'Reduccion')
    elegir('contrato-altura', '11')
    fireEvent.change(screen.getByLabelText(/^Descripción/), { target: { value: 'Copa sobre el tendido' } })
    const crear = screen.getByRole('button', { name: 'Crear atención' })
    expect(crear.getAttribute('aria-disabled')).toBe('true')

    fireEvent.change(screen.getByLabelText(/Por qué va al proveedor/), { target: { value: 'Toca el tendido eléctrico' } })
    expect(crear.getAttribute('aria-disabled')).not.toBe('true')
  })

  it('muestra el error del servidor y no sale del formulario', async () => {
    api.solicitarPodaAltura.mockRejectedValue(new ErrorApi(400, 'ErrorDominio', 'El contrato no está vigente en la fecha de registro'))
    pagina('/areas-verdes/poda-altura?ejemplar=3')
    await screen.findByText(/poda de altura mediante proveedor/)
    await screen.findByRole('option', { name: /Arbolistas del Sur/ })
    elegir('motivo-altura', 'Obstruccion')
    elegir('contrato-altura', '11')
    fireEvent.change(screen.getByLabelText(/Descripción/), { target: { value: 'Tapa la señal' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear atención' }))

    expect(await screen.findByText('El contrato no está vigente en la fecha de registro')).toBeTruthy()
  })

  it('sin permiso muestra el estado sin acceso', () => {
    permiso.planificar = false
    pagina('/areas-verdes/poda-altura')
    expect(screen.getByText('Solo el jefe de sección puede solicitar la poda de altura.')).toBeTruthy()
  })
})

describe('IntervencionPodaPage con una poda de altura solicitada', () => {
  it('muestra el motivo y la atención, y el ingeniero registra la fecha de ejecución', async () => {
    api.obtenerIntervencion.mockResolvedValueOnce(SOLICITADA).mockResolvedValueOnce({ ...SOLICITADA, fecha_ejecucion: '2026-11-10', estado: 'Incompleta' })
    api.cambiarIntervencion.mockResolvedValue({ ...SOLICITADA, fecha_ejecucion: '2026-11-10', estado: 'Incompleta' })
    pagina('/areas-verdes/intervenciones-poda/21')

    expect(await screen.findByText('Poda solicitada al proveedor')).toBeTruthy()
    expect(screen.getByText('Riesgo')).toBeTruthy()
    expect(screen.getByText('Requerimiento · AT-1234')).toBeTruthy()
    expect(screen.queryByText('Reducción de copa')).toBeNull()
    expect(screen.getByText('8.00 m')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Fecha ejecutada'), { target: { value: '2026-11-10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar fecha' }))

    await waitFor(() => expect(api.cambiarIntervencion).toHaveBeenCalledWith(21, { fecha_ejecucion: '2026-11-10' }))
    expect(await screen.findByText('Falta la fotografía de evidencia')).toBeTruthy()
  })

  it('sin permiso de registro no ofrece registrar la ejecución', async () => {
    permiso.registrar = false
    api.obtenerIntervencion.mockResolvedValue(SOLICITADA)
    pagina('/areas-verdes/intervenciones-poda/21')

    expect(await screen.findByText('Poda solicitada al proveedor')).toBeTruthy()
    expect(screen.queryByText('Registrar ejecución')).toBeNull()
  })
})
