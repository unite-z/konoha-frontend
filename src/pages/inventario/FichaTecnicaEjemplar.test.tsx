// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import FichaTecnicaEjemplarPage from './FichaTecnicaEjemplarPage'

/** Ficha técnica y evaluación del ejemplar (AV-133, RF-INV-005). */

const FICHA = {
  id: 5,
  codigo: 'EJ-0005',
  especie_nombre_comun: 'Molle',
  especie_nombre_cientifico: 'Schinus molle',
  especie_forma_biologica: 'Árbol',
  area_verde_nombre: 'Jardín Central',
  cuartel_nombre: null,
  altura_total_m: null,
  altura_fuste_m: null,
  dap_cm: null,
  radio_copa_m: null,
  origen: null,
  estado_salud: null,
  pendiente_medir: true,
  evaluaciones: [] as unknown[],
}
const EVALUACION = {
  id: 9,
  fecha: '2026-11-10',
  sin_hallazgos: false,
  enfermedades_plagas: 'Pulgón en hojas',
  danos_mecanicos_zunchado: null,
  inclinacion_ramas_secas: null,
  cavidades_pudricion: null,
  raices_expuestas: null,
  interferencia_infraestructura: null,
  manejo_recomendado: 'Control biológico',
  autor: 'ingeniero-campo',
  fecha_creacion: '2026-11-10T15:00:00Z',
}

const api = vi.hoisted(() => ({
  obtenerFichaTecnica: vi.fn(),
  cambiarFichaTecnica: vi.fn(),
  registrarEvaluacion: vi.fn(),
}))
const permiso = vi.hoisted(() => ({ registrar: true }))

vi.mock('@/services/api/fichaTecnica', () => api)
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))
vi.mock('@/sesion/ContextoSesion', () => ({ useSesionActiva: () => ({ usuario: { id: 7 } }) }))
vi.mock('@/config/permisosCore', () => ({
  PERMISOS: { registrarInventario: 'registrar' },
  puede: () => permiso.registrar,
}))

function pagina() {
  return render(
    <MemoryRouter initialEntries={['/areas-verdes/ejemplares/5/ficha-tecnica']}>
      <Routes>
        <Route path="/areas-verdes/ejemplares/:id/ficha-tecnica" element={<FichaTecnicaEjemplarPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

function escribir(id: string, valor: string) {
  fireEvent.change(document.getElementById(id) as HTMLInputElement, { target: { value: valor } })
}

beforeEach(() => {
  permiso.registrar = true
  api.obtenerFichaTecnica.mockResolvedValue(FICHA)
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Ficha técnica del ejemplar', () => {
  it('marca el ejemplar sin medidas como pendiente de medir y guarda solo lo cambiado', async () => {
    api.cambiarFichaTecnica.mockResolvedValue({
      ...FICHA,
      altura_total_m: '8.00',
      dap_cm: '35.0',
      origen: 'Nativo',
      pendiente_medir: false,
    })
    pagina()
    expect(await screen.findByText('Pendiente de medir')).toBeTruthy()
    const guardar = screen.getByRole('button', { name: 'Guardar ficha técnica' })
    expect(guardar.getAttribute('aria-disabled')).toBe('true')

    escribir('ficha-altura_total_m', '8.00')
    escribir('ficha-dap_cm', '35.0')
    fireEvent.change(document.getElementById('ficha-origen') as HTMLSelectElement, { target: { value: 'Nativo' } })
    fireEvent.click(guardar)

    await waitFor(() =>
      expect(api.cambiarFichaTecnica).toHaveBeenCalledWith(5, {
        altura_total_m: '8.00',
        dap_cm: '35.0',
        origen: 'Nativo',
      }),
    )
    expect(await screen.findByText('Ficha técnica actualizada.')).toBeTruthy()
  })

  it('vacía una medida borrada y muestra el error del backend', async () => {
    api.obtenerFichaTecnica.mockResolvedValue({ ...FICHA, altura_total_m: '8.00', pendiente_medir: false })
    api.cambiarFichaTecnica.mockRejectedValue(
      new ErrorApi(400, 'fuste-mayor-que-total', 'La altura del fuste no puede superar la altura total.'),
    )
    pagina()
    await screen.findByDisplayValue('8.00')
    escribir('ficha-altura_total_m', '')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar ficha técnica' }))
    await waitFor(() => expect(api.cambiarFichaTecnica).toHaveBeenCalledWith(5, { vaciar: ['altura_total_m'] }))
    expect(await screen.findByText('La altura del fuste no puede superar la altura total.')).toBeTruthy()
  })

  it('registra una evaluación con hallazgos y su manejo recomendado', async () => {
    api.registrarEvaluacion.mockResolvedValue(EVALUACION)
    pagina()
    await screen.findByText('Ejemplar EJ-0005')
    const guardar = screen.getByRole('button', { name: 'Guardar evaluación' })
    escribir('evaluacion-enfermedades_plagas', 'Pulgón en hojas')
    expect(guardar.getAttribute('aria-disabled')).toBe('true')
    expect(screen.getByRole('button', { name: 'Sin hallazgos' }).getAttribute('aria-disabled')).toBe('true')
    escribir('evaluacion-manejo', 'Control biológico')
    fireEvent.click(guardar)

    await waitFor(() => expect(api.registrarEvaluacion).toHaveBeenCalledTimes(1))
    expect(api.registrarEvaluacion.mock.calls[0][1]).toMatchObject({
      sin_hallazgos: false,
      enfermedades_plagas: 'Pulgón en hojas',
      danos_mecanicos_zunchado: null,
      manejo_recomendado: 'Control biológico',
    })
    expect(await screen.findByText('Evaluación guardada.')).toBeTruthy()
  })

  it('registra una evaluación sin hallazgos', async () => {
    api.registrarEvaluacion.mockResolvedValue({ ...EVALUACION, sin_hallazgos: true })
    pagina()
    await screen.findByText('Ejemplar EJ-0005')
    fireEvent.click(screen.getByRole('button', { name: 'Sin hallazgos' }))
    await waitFor(() => expect(api.registrarEvaluacion.mock.calls[0][1]).toMatchObject({ sin_hallazgos: true }))
    expect(await screen.findByText('Evaluación guardada sin hallazgos.')).toBeTruthy()
  })

  it('sin permiso de registro solo consulta la ficha y el historial', async () => {
    permiso.registrar = false
    api.obtenerFichaTecnica.mockResolvedValue({ ...FICHA, evaluaciones: [EVALUACION] })
    pagina()
    expect(await screen.findByText('Enfermedades o plagas: Pulgón en hojas')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Guardar ficha técnica' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Guardar evaluación' })).toBeNull()
  })

  it('muestra el acceso denegado si el backend responde 403', async () => {
    api.obtenerFichaTecnica.mockRejectedValue(new ErrorApi(403, 'sin-permiso', 'No tienes permiso.'))
    pagina()
    expect(await screen.findByText('No tienes permiso.')).toBeTruthy()
  })
})
