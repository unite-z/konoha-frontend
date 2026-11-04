// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { obtenerMiIncidencia } from '@/services/api/incidencias'
import type { SeguimientoIncidencia } from '@/types/incidencias'
import MiIncidenciaPage from './MiIncidenciaPage'

vi.mock('@/services/api/incidencias', () => ({ obtenerMiIncidencia: vi.fn() }))

const CERRADA: SeguimientoIncidencia = {
  id: 41,
  codigo: 'INC-2026-041',
  tipo: 'Rama caída',
  estado: 'Cerrada',
  minutos_cierre: 145,
  pasos: [
    { estado: 'Cerrada', fecha_hora: '2026-11-04T16:45:00Z' },
    { estado: 'Atendida', fecha_hora: '2026-11-04T16:40:00Z' },
    { estado: 'Registrada', fecha_hora: '2026-11-04T14:20:00Z' },
  ],
  evidencia: { url: null },
}

function pintar() {
  render(
    <MemoryRouter initialEntries={['/mis-incidencias/41']}>
      <Routes>
        <Route path="/mis-incidencias/:id" element={<MiIncidenciaPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('MiIncidenciaPage', () => {
  beforeEach(() => vi.mocked(obtenerMiIncidencia).mockReset())
  afterEach(cleanup)

  it('muestra el tiempo de cierre, los pasos con el actual arriba y la evidencia', async () => {
    vi.mocked(obtenerMiIncidencia).mockResolvedValue(CERRADA)
    pintar()
    expect(await screen.findByRole('heading', { name: 'Rama caída' })).toBeTruthy()
    expect(screen.getByText('2 h 25 min')).toBeTruthy()
    const pasos = within(screen.getByRole('list', { name: 'Seguimiento' })).getAllByRole('listitem')
    expect(pasos.map((paso) => paso.textContent)).toEqual([expect.stringContaining('Cerrada, estado actual'), expect.stringContaining('Atendida'), expect.stringContaining('Registrada')])
    expect(screen.getByRole('img', { name: 'Evidencia sin foto' })).toBeTruthy()
  })

  it('sin cerrar ni atender, no muestra el tiempo de cierre ni la evidencia', async () => {
    vi.mocked(obtenerMiIncidencia).mockResolvedValue({ ...CERRADA, estado: 'Clasificada', minutos_cierre: null, pasos: CERRADA.pasos.slice(2), evidencia: null })
    pintar()
    expect(await screen.findByRole('heading', { name: 'Rama caída' })).toBeTruthy()
    expect(screen.queryByText('tiempo de cierre')).toBeNull()
    expect(screen.queryByText('Evidencia')).toBeNull()
  })
})
