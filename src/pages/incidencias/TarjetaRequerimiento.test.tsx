// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { incidenciaSimulada } from '@/services/simulados/incidencias'
import TarjetaRequerimiento from './TarjetaRequerimiento'

const incidencia = incidenciaSimulada(41)
const crearRequerimiento = vi.fn(async (_id: number, _cuerpo: unknown) => ({ ...incidencia, estado: 'DerivadaTercerizada' }))
vi.mock('@/services/api/incidencias', () => ({
  listarProveedoresIncidencia: async () => [
    { id: 7, razon_social: 'Podas Altura Demo E.I.R.L.', contratos: [{ id: 70, codigo: 'CT-DEMO-007', vigente: true, servicios: ['Poda en altura'] }] },
    { id: 8, razon_social: 'Arbolistas del Perú', contratos: [] },
  ],
  crearRequerimiento: (id: number, cuerpo: unknown) => crearRequerimiento(id, cuerpo),
}))

afterEach(() => {
  cleanup()
  crearRequerimiento.mockClear()
})

describe('TarjetaRequerimiento', () => {
  it('con contrato vigente crea el requerimiento extraordinario (Figma 389-7706)', async () => {
    if (!incidencia) throw new Error('sin incidencia simulada')
    const onCreado = vi.fn()
    render(<TarjetaRequerimiento incidencia={incidencia} onVolver={vi.fn()} onCreado={onCreado} />)
    const usuario = userEvent.setup()

    await usuario.selectOptions(await screen.findByLabelText(/^Proveedor/), '7')
    expect(screen.getByRole('option', { name: 'CT-DEMO-007 · vigente' })).toHaveProperty('selected', true)
    expect(screen.getByRole('radio', { name: 'Extraordinaria' })).toHaveProperty('checked', true)
    // MOD-02 aún no tiene la poda vinculada (RF-POD-005): no se ofrece.
    expect(screen.queryByRole('checkbox', { name: 'Crear también la poda del ejemplar' })).toBeNull()

    await usuario.click(screen.getByRole('button', { name: 'Crear requerimiento' }))
    expect(crearRequerimiento).toHaveBeenCalledWith(41, { proveedor_id: 7, contrato_id: 70, servicio: 'Poda en altura', tipo_atencion: 'Extraordinaria', crear_poda: false })
    expect(onCreado).toHaveBeenCalledWith(expect.objectContaining({ estado: 'DerivadaTercerizada' }), 'Requerimiento creado para Podas Altura Demo E.I.R.L.')
  })

  it('sin contrato vigente avisa y no deja crearlo: MOD-05 aún no registra atenciones sin contrato (AV-278)', async () => {
    if (!incidencia) throw new Error('sin incidencia simulada')
    render(<TarjetaRequerimiento incidencia={incidencia} onVolver={vi.fn()} onCreado={vi.fn()} />)
    const usuario = userEvent.setup()

    await usuario.selectOptions(await screen.findByLabelText(/^Proveedor/), '8')
    expect(screen.getByText('Sin contrato vigente')).toBeTruthy()
    expect(screen.queryByLabelText(/^Contrato/)).toBeNull()
    const crear = screen.getByRole('button', { name: 'Crear requerimiento' })
    await usuario.click(crear)
    expect(crearRequerimiento).not.toHaveBeenCalled()
  })
})
