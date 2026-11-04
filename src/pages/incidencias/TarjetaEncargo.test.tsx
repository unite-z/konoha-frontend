// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { incidenciaSimulada } from '@/services/simulados/incidencias'
import type { CapatazDisponible } from '@/types/incidencias'
import TarjetaEncargo from './TarjetaEncargo'

const incidencia = incidenciaSimulada(39)
const llenas: CapatazDisponible[] = [
  { id: 1, nombre: 'Marta R.', cuadrilla: 'Cuadrilla A', carga: { asignados: 6, capacidad: 6 } },
  { id: 2, nombre: 'Luis P.', cuadrilla: 'Cuadrilla B', carga: { asignados: 5, capacidad: 5 } },
]
const conHueco: CapatazDisponible[] = [llenas[0], { ...llenas[1], carga: { asignados: 3, capacidad: 5 } }]
const listarCapatacesDisponibles = vi.fn(async (_id: number, _signal?: AbortSignal, fecha?: string) => (fecha === '2026-11-06' ? llenas : conHueco))
const crearEncargo = vi.fn(async (_id: number, _cuerpo: unknown) => ({ ...incidencia, estado: 'DerivadaInterna', responsable: 'Luis P.' }))
vi.mock('@/services/api/incidencias', () => ({
  listarCapatacesDisponibles: (id: number, signal?: AbortSignal, fecha?: string) => listarCapatacesDisponibles(id, signal, fecha),
  listarActividadesEncargo: async () => ['Retiro de rama caída', 'Poda menor'],
  crearEncargo: (id: number, cuerpo: unknown) => crearEncargo(id, cuerpo),
}))
vi.mock('@/utils/instanteLima', async (original) => ({ ...(await original<typeof import('@/utils/instanteLima')>()), hoyLima: () => '2026-11-04' }))

afterEach(cleanup)

describe('TarjetaEncargo', () => {
  it('ofrece solo los capataces libres y crea el encargo con lo que se incluye (Figma 389-7502)', async () => {
    if (!incidencia) throw new Error('sin incidencia simulada')
    const onCreado = vi.fn()
    render(<TarjetaEncargo incidencia={incidencia} onVolver={vi.fn()} onCreado={onCreado} />)
    const usuario = userEvent.setup()

    expect(await screen.findByRole('option', { name: 'Luis P. · Cuadrilla B' })).toBeTruthy()
    expect(screen.queryByRole('option', { name: 'Marta R. · Cuadrilla A' })).toBeNull()
    expect(screen.getByText('T-0218')).toBeTruthy()

    await usuario.selectOptions(screen.getByLabelText(/^Capataz/), '2')
    await usuario.selectOptions(await screen.findByLabelText(/^Actividad/), 'Poda menor')
    await usuario.click(screen.getByRole('button', { name: 'Crear encargo' }))
    expect(crearEncargo).toHaveBeenCalledWith(39, {
      capataz_id: 2,
      espacio: 'Pabellón Z',
      actividad: 'Poda menor',
      plazo: '2026-11-05',
      incluye: ['Foto', 'Descripción', 'T-0218'],
      avisar_capataz: true,
    })
    expect(onCreado).toHaveBeenCalledWith(expect.objectContaining({ estado: 'DerivadaInterna' }), 'Encargo creado para Luis P.')
  })

  it('sin capataz libre ese día muestra la carga y reprograma el plazo (Figma 394-8975)', async () => {
    if (!incidencia) throw new Error('sin incidencia simulada')
    render(<TarjetaEncargo incidencia={incidencia} onVolver={vi.fn()} onCreado={vi.fn()} />)
    const usuario = userEvent.setup()
    await screen.findByRole('option', { name: 'Luis P. · Cuadrilla B' })

    const plazo = screen.getByLabelText(/^Plazo/)
    await usuario.clear(plazo)
    await usuario.type(plazo, '2026-11-06')
    expect(await screen.findByText('Carga del 06/11')).toBeTruthy()
    expect(screen.getByText('6 de 6')).toBeTruthy()
    expect(screen.getByLabelText(/^Capataz/).getAttribute('aria-invalid')).toBe('true')

    const nuevo = screen.getByLabelText(/^Plazo/)
    await usuario.clear(nuevo)
    await usuario.type(nuevo, '2026-11-07')
    await usuario.click(screen.getByRole('button', { name: 'Reprogramar plazo' }))
    expect(await screen.findByRole('option', { name: 'Luis P. · Cuadrilla B' })).toBeTruthy()
    expect(listarCapatacesDisponibles).toHaveBeenLastCalledWith(39, expect.anything(), '2026-11-07')
  })
})
