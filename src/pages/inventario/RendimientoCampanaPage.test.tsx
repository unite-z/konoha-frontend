// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import RendimientoCampanaPage from './RendimientoCampanaPage'

const RENDIMIENTO = {
  verificados: 180,
  dias_con_ejecucion: 15,
  promedio: '12.00',
  umbral_alerta: 18,
  destacado: false,
  tramos: [
    { dia_desde: 1, dia_hasta: 5, fecha_desde: '2025-12-20', fecha_hasta: '2025-12-24', atendidos: 60, promedio: '12.00' },
    { dia_desde: 6, dia_hasta: 10, fecha_desde: '2025-12-25', fecha_hasta: '2025-12-29', atendidos: 120, promedio: '24.00' },
  ],
}

const { consultarRendimiento } = vi.hoisted(() => ({ consultarRendimiento: vi.fn() }))

vi.mock('@/services/api/campanasPoda', () => ({ consultarRendimiento }))
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))

function pagina() {
  return render(
    <MemoryRouter initialEntries={['/areas-verdes/campanas-poda/5/rendimiento']}>
      <Routes>
        <Route path="/areas-verdes/campanas-poda/:id" element={<p>Ficha de campaña</p>} />
        <Route path="/areas-verdes/campanas-poda/:id/rendimiento" element={<RendimientoCampanaPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('RendimientoCampanaPage', () => {
  it('muestra el resultado y la evolución por tramos', async () => {
    consultarRendimiento.mockResolvedValue(RENDIMIENTO)
    pagina()

    expect(await screen.findByText('12.00 por día')).toBeTruthy()
    expect(screen.getByText('180')).toBeTruthy()
    expect(screen.getByText('15')).toBeTruthy()
    expect(screen.getByText('Días 1–5')).toBeTruthy()
    expect(screen.getByText('24.00')).toBeTruthy()
    expect(screen.queryByText(/Rendimiento destacado/)).toBeNull()
    expect(consultarRendimiento).toHaveBeenCalledWith(5, expect.any(AbortSignal))
  })

  it('destaca el valor que alcanza el umbral', async () => {
    consultarRendimiento.mockResolvedValue({ ...RENDIMIENTO, promedio: '18.00', destacado: true })
    pagina()

    expect(await screen.findByText('Rendimiento destacado · 18.00 por día')).toBeTruthy()
  })

  it('sin ejecución no muestra promedio', async () => {
    consultarRendimiento.mockResolvedValue({ ...RENDIMIENTO, verificados: 0, dias_con_ejecucion: 0, promedio: null, tramos: [] })
    pagina()

    expect(await screen.findByText('Sin ejecución verificada')).toBeTruthy()
    expect(screen.queryByText(/por día$/)).toBeNull()
  })

  it('muestra el 403 y el error con reintento', async () => {
    consultarRendimiento.mockRejectedValueOnce(new ErrorApi(403, 'sin-permiso', 'Sin permiso para el rendimiento'))
    pagina()
    expect(await screen.findByText('Sin permiso para el rendimiento')).toBeTruthy()
    cleanup()

    consultarRendimiento.mockRejectedValueOnce(new ErrorApi(500, null, 'Fallo del servidor'))
    consultarRendimiento.mockResolvedValueOnce(RENDIMIENTO)
    pagina()
    expect(await screen.findByText('No pudimos calcular el rendimiento')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }))
    expect(await screen.findByText('12.00 por día')).toBeTruthy()
  })

  it('vuelve a la campaña', async () => {
    consultarRendimiento.mockResolvedValue(RENDIMIENTO)
    pagina()

    fireEvent.click(await screen.findByRole('button', { name: 'Volver a la campaña' }))
    expect(await screen.findByText('Ficha de campaña')).toBeTruthy()
  })
})
