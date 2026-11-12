// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import type { IntervencionPoda } from '@/types/intervencionesPoda'
import PlantaMuertaEjemplar from './PlantaMuertaEjemplar'

/** Poda a demanda por planta muerta (AV-312): propone registrar el ejemplar como muerto (AV-303). */

const INTERVENCION = {
  id: 21,
  ejemplar_id: 3,
  ejemplar_codigo: 'EJ-0003',
  categoria: 'AlturaDemanda',
  fecha_ejecucion: '2026-11-10',
  motivo: 'PlantaMuerta',
  atencion_codigo: 'AT-1234',
} as unknown as IntervencionPoda

const EJEMPLAR = { id: 3, codigo: 'EJ-0003', situacion: 'activo', fecha_situacion: null }

const api = vi.hoisted(() => ({ listarEjemplarPorCodigo: vi.fn(), cambiarSituacionEjemplar: vi.fn() }))
const permiso = vi.hoisted(() => ({ gestionar: true }))
vi.mock('@/services/api/ejemplares', () => api)
vi.mock('@/sesion/ContextoSesion', () => ({ useSesionActiva: () => ({ usuario: { id: 7 } }) }))
vi.mock('@/config/permisosCore', () => ({
  PERMISOS: { gestionarCatalogos: 'gestionar' },
  puede: () => permiso.gestionar,
}))

beforeEach(() => {
  permiso.gestionar = true
  api.listarEjemplarPorCodigo.mockResolvedValue([EJEMPLAR])
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Planta muerta en la poda a demanda', () => {
  it('propone registrar el ejemplar como muerto con la fecha de ejecución y la atención', async () => {
    api.cambiarSituacionEjemplar.mockResolvedValue({ ...EJEMPLAR, situacion: 'muerto' })
    render(<PlantaMuertaEjemplar intervencion={INTERVENCION} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar el ejemplar como muerto' }))
    expect((document.getElementById('fecha-planta-muerta') as HTMLInputElement).value).toBe('2026-11-10')

    api.listarEjemplarPorCodigo.mockResolvedValue([{ ...EJEMPLAR, situacion: 'muerto', fecha_situacion: '2026-11-10' }])
    fireEvent.click(screen.getByRole('button', { name: 'Registrar como muerto' }))
    await waitFor(() =>
      expect(api.cambiarSituacionEjemplar).toHaveBeenCalledWith(3, {
        situacion: 'muerto',
        fecha: '2026-11-10',
        motivo: 'Planta muerta: poda a demanda (atención AT-1234)',
      }),
    )
    expect(await screen.findByText('Ejemplar registrado como muerto')).toBeTruthy()
  })

  it('muestra el error del backend sin cambiar nada', async () => {
    api.cambiarSituacionEjemplar.mockRejectedValue(
      new ErrorApi(403, 'sin-permiso', 'No tienes permiso para gestionar ejemplares.'),
    )
    render(<PlantaMuertaEjemplar intervencion={INTERVENCION} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar el ejemplar como muerto' }))
    fireEvent.click(screen.getByRole('button', { name: 'Registrar como muerto' }))
    expect(await screen.findByText('No tienes permiso para gestionar ejemplares.')).toBeTruthy()
  })

  it('sin permiso para gestionar el inventario solo informa', async () => {
    permiso.gestionar = false
    render(<PlantaMuertaEjemplar intervencion={INTERVENCION} />)
    expect(await screen.findByText(/Quien gestiona el inventario/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Registrar el ejemplar como muerto' })).toBeNull()
  })

  it('no propone nada si el ejemplar ya no está activo por otra causa', async () => {
    api.listarEjemplarPorCodigo.mockResolvedValue([{ ...EJEMPLAR, situacion: 'retirado' }])
    const { container } = render(<PlantaMuertaEjemplar intervencion={INTERVENCION} />)
    await waitFor(() => expect(api.listarEjemplarPorCodigo).toHaveBeenCalled())
    expect(container.textContent).toBe('')
  })
})
