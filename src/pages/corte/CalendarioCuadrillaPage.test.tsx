// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CalendarioCuadrilla } from '@/types/corte'
import CalendarioCuadrillaPage from './CalendarioCuadrillaPage'

const obtenerCalendarioCuadrilla = vi.fn(
  async (): Promise<CalendarioCuadrilla> => ({
    cuadrilla: 'Cuadrilla B',
    programaciones: [
      { id: 1, tipo_servicio_id: 2, servicio: 'Poda · Cuad. B', proveedor_id: null, proveedor: null, estacion: 'Primavera', fecha_inicio_prevista: '2026-11-09', fecha_fin_prevista: '2026-11-09', estado: 'Programada', fecha_inicio_real: null, fecha_fin_real: null },
    ],
    restricciones: [
      { id: 3, tipo_restriccion_id: 1, tipo: 'Examen de admisión', efecto: 'Prohibicion', aplica_servicios_ruidosos: true, fecha_inicio: '2026-11-15', fecha_fin: '2026-11-15', hora_inicio: null, hora_fin: null, area_verde_id: null, descripcion: null, serie: null },
    ],
  }),
)
vi.mock('@/services/api/corte', () => ({ obtenerCalendarioCuadrilla: (...argumentos: unknown[]) => obtenerCalendarioCuadrilla(...(argumentos as [])) }))
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))
vi.mock('@/utils/instanteLima', async (original) => ({ ...(await original<typeof import('@/utils/instanteLima')>()), hoyLima: () => '2026-11-12' }))

afterEach(cleanup)

describe('CalendarioCuadrillaPage', () => {
  it('muestra la semana de la cuadrilla en solo lectura y pide la semana siguiente (Figma 380-8307)', async () => {
    render(
      <MemoryRouter>
        <CalendarioCuadrillaPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Cuadrilla B · solo lectura')).toBeTruthy()
    expect(screen.getByText('Poda · Cuad. B')).toBeTruthy()
    expect(screen.getByText('Examen de admisión')).toBeTruthy()
    expect(obtenerCalendarioCuadrilla).toHaveBeenLastCalledWith('2026-11-09', '2026-11-15', expect.anything())
    expect(screen.queryByRole('button', { name: /Programar/ })).toBeNull()

    await userEvent.setup().click(screen.getByRole('button', { name: 'Semana siguiente' }))
    expect(obtenerCalendarioCuadrilla).toHaveBeenLastCalledWith('2026-11-16', '2026-11-22', expect.anything())
  })
})
