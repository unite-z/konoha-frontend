// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { incidenciaSimulada } from '@/services/simulados/incidencias'
import TarjetaRevisarAtencion from './TarjetaRevisarAtencion'

const atendida = incidenciaSimulada(35)
const sinEvidencia = incidenciaSimulada(31)
const cerrarIncidencia = vi.fn(async (_id: number, _observaciones?: string) => ({ ...atendida, estado: 'Cerrada' }))
const devolverIncidencia = vi.fn(async (_id: number, _observaciones: string) => ({ ...atendida, estado: 'EnAtencion' }))
vi.mock('@/services/api/incidencias', () => ({
  cerrarIncidencia: (id: number, observaciones?: string) => cerrarIncidencia(id, observaciones),
  devolverIncidencia: (id: number, observaciones: string) => devolverIncidencia(id, observaciones),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('TarjetaRevisarAtencion', () => {
  it('muestra quién la atendió y la evidencia, y cierra la incidencia (Figma 390-8008)', async () => {
    if (!atendida?.atencion) throw new Error('sin atención simulada')
    const onCambiada = vi.fn()
    render(<TarjetaRevisarAtencion incidencia={atendida} atencion={atendida.atencion} onCambiada={onCambiada} />)

    expect(screen.getByText(/^Atendida por Luis P\. · .* · encargo ENC-2026-118$/)).toBeTruthy()
    expect(screen.getAllByRole('img', { name: /^Evidencia/ })).toHaveLength(2)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cerrar incidencia' }))
    expect(cerrarIncidencia).toHaveBeenCalledWith(35, undefined)
    expect(onCambiada).toHaveBeenCalledWith(expect.objectContaining({ estado: 'Cerrada' }), 'INC-2026-035 cerrada')
  })

  it('sin evidencia no deja cerrar (Figma 390-8205)', async () => {
    if (!sinEvidencia?.atencion) throw new Error('sin atención simulada')
    render(<TarjetaRevisarAtencion incidencia={sinEvidencia} atencion={sinEvidencia.atencion} onCambiada={vi.fn()} />)

    expect(screen.getByText('Sin evidencia')).toBeTruthy()
    expect(screen.getByText('Para cerrar hace falta la evidencia.')).toBeTruthy()
    const cerrar = screen.getByRole('button', { name: 'Cerrar incidencia' })
    expect(cerrar.getAttribute('aria-disabled')).toBe('true')
    await userEvent.setup().click(cerrar)
    expect(cerrarIncidencia).not.toHaveBeenCalled()
  })

  it('«Devolver» pide observaciones y la devuelve a En atención (Figma 390-8390)', async () => {
    if (!atendida?.atencion) throw new Error('sin atención simulada')
    const onCambiada = vi.fn()
    render(<TarjetaRevisarAtencion incidencia={atendida} atencion={atendida.atencion} onCambiada={onCambiada} />)
    const usuario = userEvent.setup()

    await usuario.click(screen.getByRole('button', { name: 'Devolver' }))
    expect(screen.getByRole('heading', { name: 'Devolver a En atención' })).toBeTruthy()
    await usuario.click(screen.getByRole('button', { name: 'Devolver' }))
    expect(screen.getByText('Explica qué falta por hacer.')).toBeTruthy()
    await usuario.type(screen.getByLabelText(/^Observaciones/), 'Quedan restos de la rama en el paso peatonal.')
    await usuario.click(screen.getByRole('button', { name: 'Devolver' }))
    expect(devolverIncidencia).toHaveBeenCalledWith(35, 'Quedan restos de la rama en el paso peatonal.')
    expect(onCambiada).toHaveBeenCalledWith(expect.objectContaining({ estado: 'EnAtencion' }), 'INC-2026-035 devuelta a En atención')
  })
})
