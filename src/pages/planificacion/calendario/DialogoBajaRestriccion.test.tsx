// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Restriccion } from '@/types/planificacion'
import DialogoBajaRestriccion from './DialogoBajaRestriccion'

const baja = vi.hoisted(() => vi.fn(async () => undefined))
vi.mock('@/services/api/planificacion', () => ({
  darDeBajaRestriccion: baja,
  listarRestricciones: async () => [
    { ...jueves, id: 9, fecha_inicio: '2026-11-12', fecha_fin: '2026-11-12' },
    { ...jueves, id: 10, fecha_inicio: '2026-11-19', fecha_fin: '2026-11-19' },
    { ...jueves, id: 11, fecha_inicio: '2026-12-31', fecha_fin: '2026-12-31' },
    { ...jueves, id: 12, serie: 'otra', fecha_inicio: '2026-11-20', fecha_fin: '2026-11-20' },
  ],
}))

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
  baja.mockClear()
})

const jueves: Restriccion = {
  id: 9,
  tipo_restriccion_id: 1,
  tipo: 'Jueves culturales',
  efecto: 'Advertencia',
  aplica_servicios_ruidosos: true,
  fecha_inicio: '2026-11-12',
  fecha_fin: '2026-11-12',
  hora_inicio: null,
  hora_fin: null,
  area_verde_id: null,
  descripcion: null,
  serie: 'S-3',
}

describe('DialogoBajaRestriccion', () => {
  it('con serie, deja elegir toda la serie y la da de baja', async () => {
    const onBaja = vi.fn()
    const usuario = userEvent.setup()
    render(<DialogoBajaRestriccion restriccion={jueves} onCerrar={vi.fn()} onBaja={onBaja} />)

    expect(screen.getByText('Jueves 12/11')).toBeTruthy()
    expect(await screen.findByText('3 fechas, hasta el 31/12')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeTruthy()
    await usuario.click(screen.getByRole('radio', { name: /Toda la serie/ }))
    await usuario.click(screen.getByRole('button', { name: 'Dar de baja' }))
    expect(baja).toHaveBeenCalledWith(9, true)
    expect(onBaja).toHaveBeenCalledWith(true)
  })

  it('sin serie no pregunta el alcance y da de baja solo esa restricción', async () => {
    render(<DialogoBajaRestriccion restriccion={{ ...jueves, serie: null }} onCerrar={vi.fn()} onBaja={vi.fn()} />)

    expect(screen.queryByRole('radio')).toBeNull()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Dar de baja' }))
    expect(baja).toHaveBeenCalledWith(9, false)
  })
})
