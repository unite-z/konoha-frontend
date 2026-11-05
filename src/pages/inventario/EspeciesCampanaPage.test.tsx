// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import EspeciesCampanaPage from './EspeciesCampanaPage'

const ESPECIES = {
  planificados: 220,
  atendidos: 180,
  incompletos: 1,
  especies: [
    { especie_id: 7, nombre_comun: 'Molle', nombre_cientifico: 'Schinus molle', planificados: 140, atendidos: 120, incompletos: 1 },
    { especie_id: 8, nombre_comun: null, nombre_cientifico: 'Ficus benjamina', planificados: 70, atendidos: 60, incompletos: 0 },
    { especie_id: null, nombre_comun: null, nombre_cientifico: null, planificados: 10, atendidos: 0, incompletos: 0 },
  ],
}

const { consultarEspecies, obtenerCampana } = vi.hoisted(() => ({ consultarEspecies: vi.fn(), obtenerCampana: vi.fn() }))

vi.mock('@/services/api/campanasPoda', () => ({ consultarEspecies, obtenerCampana }))
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))

function pagina() {
  return render(
    <MemoryRouter initialEntries={['/areas-verdes/campanas-poda/5/especies']}>
      <Routes>
        <Route path="/areas-verdes/campanas-poda/:id" element={<p>Ficha de campaña</p>} />
        <Route path="/areas-verdes/campanas-poda/:id/especies" element={<EspeciesCampanaPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  obtenerCampana.mockResolvedValue({ id: 5, nombre: 'Cierre 2026-2027', fecha_inicio: '2026-12-20', fecha_fin: '2026-12-29' })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('EspeciesCampanaPage', () => {
  it('separa atendidos y planificados por especie', async () => {
    consultarEspecies.mockResolvedValue(ESPECIES)
    pagina()

    expect(await screen.findByText('Molle')).toBeTruthy()
    expect(screen.getByText('Ficus benjamina')).toBeTruthy()
    expect(screen.getByText('Sin especie asignada')).toBeTruthy()
    expect(screen.getByText('120')).toBeTruthy()
    expect(screen.getByText('140')).toBeTruthy()
    expect(await screen.findByText('Campaña · Cierre 2026-2027')).toBeTruthy()
    expect(screen.getByText(/Planificados: 220 · Atendidos: 180 · Sin fotografía: 1/)).toBeTruthy()
    expect(screen.queryByText('Sin atenciones verificadas')).toBeNull()
    expect(consultarEspecies).toHaveBeenCalledWith(5, expect.any(AbortSignal))
  })

  it('sin intervenciones avisa de que solo hay planificación', async () => {
    consultarEspecies.mockResolvedValue({
      planificados: 10,
      atendidos: 0,
      incompletos: 0,
      especies: [{ especie_id: null, nombre_comun: null, nombre_cientifico: null, planificados: 10, atendidos: 0, incompletos: 0 }],
    })
    pagina()

    expect(await screen.findByText('Sin atenciones verificadas')).toBeTruthy()
    expect(screen.getByText('Sin especie asignada')).toBeTruthy()
  })

  it('sin ejemplares muestra el estado vacío', async () => {
    consultarEspecies.mockResolvedValue({ planificados: 0, atendidos: 0, incompletos: 0, especies: [] })
    pagina()

    expect(await screen.findByText('Sin ejemplares')).toBeTruthy()
    expect(screen.queryByText('Atendidos por especie')).toBeNull()
  })

  it('muestra el 403 y el error con reintento', async () => {
    consultarEspecies.mockRejectedValueOnce(new ErrorApi(403, 'sin-permiso', 'Sin permiso para las especies'))
    pagina()
    expect(await screen.findByText('Sin permiso para las especies')).toBeTruthy()
    cleanup()

    consultarEspecies.mockRejectedValueOnce(new ErrorApi(500, null, 'Fallo del servidor'))
    consultarEspecies.mockResolvedValueOnce(ESPECIES)
    pagina()
    expect(await screen.findByText('No pudimos cargar las especies')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }))
    expect(await screen.findByText('Molle')).toBeTruthy()
  })

  it('vuelve a la campaña', async () => {
    consultarEspecies.mockResolvedValue(ESPECIES)
    pagina()

    fireEvent.click(await screen.findByRole('button', { name: 'Volver a la campaña' }))
    expect(await screen.findByText('Ficha de campaña')).toBeTruthy()
  })
})
