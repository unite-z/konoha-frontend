// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { incidenciaSimulada } from '@/services/simulados/incidencias'
import IncidenciaDetallePage from './IncidenciaDetallePage'

const incidencia = incidenciaSimulada(41)
const clasificarIncidencia = vi.fn(async (_id: number, _cuerpo: unknown) => ({ ...incidencia, estado: 'Clasificada' }))
const descartarIncidencia = vi.fn(async (_id: number, _motivo: string) => ({ ...incidencia, estado: 'Descartada' }))
const solicitarInspeccion = vi.fn(async (_id: number, _cuerpo: unknown) => undefined)
vi.mock('@/services/api/incidencias', () => ({
  obtenerIncidencia: async () => incidencia,
  clasificarIncidencia: (id: number, cuerpo: unknown) => clasificarIncidencia(id, cuerpo),
  descartarIncidencia: (id: number, motivo: string) => descartarIncidencia(id, motivo),
  listarInspectores: async () => [{ id: 1, nombre: 'Ing. Carla M.' }],
  solicitarInspeccion: (id: number, cuerpo: unknown) => solicitarInspeccion(id, cuerpo),
}))
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))
// Quien gestiona incidencias (jefatura): sin este permiso las tarjetas de acción no se pintan (AV-406).
const sesion = vi.hoisted(() => ({ permisos: ['PLA.INCIDENCIA.CLASIFICAR'] as string[] }))
vi.mock('@/sesion/ContextoSesion', () => ({ useSesionActiva: () => ({ permisos: sesion.permisos }) }))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false
  }
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function pintar() {
  render(
    <MemoryRouter initialEntries={['/incidencias/41']}>
      <Routes>
        <Route path="/incidencias/:id" element={<IncidenciaDetallePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TarjetaClasificar (en el detalle de incidencia)', () => {
  it('clasifica con la vía sugerida por la altura (Figma 388-7305)', async () => {
    pintar()
    const usuario = userEvent.setup()
    expect(await screen.findByText('T-0412 · Ficus · 7 m')).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'Proveedor tercerizado' })).toHaveProperty('checked', true)

    await usuario.click(screen.getByRole('button', { name: 'Clasificar y derivar' }))
    expect(screen.getByText('Elige la severidad.')).toBeTruthy()
    expect(clasificarIncidencia).not.toHaveBeenCalled()

    await usuario.click(screen.getByRole('radio', { name: 'Media' }))
    await usuario.click(screen.getByRole('radio', { name: 'Alto' }))
    await usuario.click(screen.getByRole('button', { name: 'Clasificar y derivar' }))
    expect(clasificarIncidencia).toHaveBeenCalledWith(41, { severidad: 'Media', impacto: 'Alto', via: 'Tercerizada', motivo_cambio_via: undefined })
    expect(await screen.findByText('INC-2026-041 clasificada')).toBeTruthy()
  })

  it('con otra vía que la sugerida pide el motivo y «Cancelar» vuelve a la sugerida (Figma 389-7300)', async () => {
    pintar()
    const usuario = userEvent.setup()
    await screen.findByText('T-0412 · Ficus · 7 m')
    await usuario.click(screen.getByRole('radio', { name: 'Media' }))
    await usuario.click(screen.getByRole('radio', { name: 'Alto' }))
    await usuario.click(screen.getByRole('radio', { name: 'Personal propio' }))
    expect(screen.getByText('Severidad media')).toBeTruthy()
    expect(screen.getByText('Impacto alto')).toBeTruthy()

    await usuario.click(screen.getByRole('button', { name: 'Clasificar y derivar' }))
    expect(screen.getByText('Explica por qué cambias la vía sugerida.')).toBeTruthy()
    await usuario.type(screen.getByLabelText(/^Motivo del cambio/), 'La cuadrilla B tiene escalera')
    await usuario.click(screen.getByRole('button', { name: 'Clasificar y derivar' }))
    expect(clasificarIncidencia).toHaveBeenCalledWith(41, expect.objectContaining({ via: 'PersonalPropio', motivo_cambio_via: 'La cuadrilla B tiene escalera' }))
  })

  it('descarta con motivo (394-8700) y pide la inspección en campo (394-8782)', async () => {
    pintar()
    const usuario = userEvent.setup()
    await screen.findByText('T-0412 · Ficus · 7 m')

    await usuario.click(screen.getByRole('button', { name: 'Descartar' }))
    const dialogo = screen.getByRole('dialog', { name: 'Descartar INC-2026-041' })
    await usuario.type(within(dialogo).getByLabelText(/^Motivo/), 'Duplicada de INC-2026-040')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Descartar' }))
    expect(descartarIncidencia).toHaveBeenCalledWith(41, 'Duplicada de INC-2026-040')
    expect(await screen.findByText('INC-2026-041 descartada')).toBeTruthy()
  })

  it('«Solicitar inspección en campo» abre su tarjeta y la pide al responsable', async () => {
    pintar()
    const usuario = userEvent.setup()
    await screen.findByText('T-0412 · Ficus · 7 m')
    await usuario.click(screen.getByRole('button', { name: 'Solicitar inspección en campo' }))
    expect(screen.getByRole('heading', { name: 'Solicitar inspección' })).toBeTruthy()
    await usuario.selectOptions(await screen.findByLabelText(/^Responsable/), '1')
    await usuario.type(screen.getByLabelText('Qué verificar'), 'Riesgo de caída del resto de la rama')
    await usuario.click(screen.getByRole('button', { name: 'Solicitar' }))
    expect(solicitarInspeccion).toHaveBeenCalledWith(41, { responsable_id: 1, que_verificar: 'Riesgo de caída del resto de la rama' })
    expect(await screen.findByText('Inspección solicitada a Ing. Carla M.')).toBeTruthy()
  })
})
