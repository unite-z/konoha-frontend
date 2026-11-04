// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cicloCorteSimulado } from '@/services/simulados/corte'
import type { Programacion } from '@/types/planificacion'
import DialogoInterrupcion, { zonasAfectables } from './DialogoInterrupcion'

const registrar = vi.hoisted(() => vi.fn(async (_id: number, cuerpo: { zona_afectada: string; zona_alternativa: string }) => ({ id: 2, minutos_descontados: 0, ...cuerpo })))
vi.mock('@/services/api/corte', () => ({
  listarZonasAlternativas: async () => [
    { zona: 'Ciencias', pendientes: 14, aviso_hoy: null },
    { zona: 'Letras', pendientes: 9, aviso_hoy: 'Reserva de jardín' },
  ],
  registrarInterrupcion: registrar,
}))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false
  }
})
afterEach(cleanup)

const ciclo: Programacion = {
  id: 1,
  tipo_servicio_id: 1,
  servicio: 'Corte de césped',
  proveedor_id: 4,
  proveedor: 'Servicios Verdes Demo S.A.C.',
  estacion: 'Primavera',
  fecha_inicio_prevista: '2026-11-16',
  fecha_fin_prevista: '2026-11-19',
  estado: 'EnCurso',
  fecha_inicio_real: '2026-11-16',
  fecha_fin_real: null,
}
const corte = cicloCorteSimulado(ciclo, '2026-11-17')

describe('DialogoInterrupcion (Figma 347-1342)', () => {
  it('ofrece las zonas con jardines pendientes, con el primero de cada una', () => {
    expect(zonasAfectables(corte).map((z) => z.texto)).toEqual(['Ciencias · Talud de Química', 'Sociales · Pabellón Z', 'Letras · Patio de Letras'])
  })

  it('pide motivo y zona alternativa y registra el traslado', async () => {
    const onRegistrada = vi.fn()
    const usuario = userEvent.setup()
    render(
      <MemoryRouter>
        <DialogoInterrupcion ciclo={ciclo} corte={corte} ahora="2026-11-17T10:15" onCerrar={vi.fn()} onRegistrada={onRegistrada} />
      </MemoryRouter>,
    )

    expect((screen.getByLabelText(/^Zona afectada/) as HTMLSelectElement).value).toBe('Sociales')
    expect(await screen.findByText('9 jardines pendientes · aviso: reserva de jardín hoy')).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: 'Avisar al proveedor' })).toHaveProperty('checked', true)
    expect(screen.getByRole('link', { name: 'Sin zona libre: reprogramar' }).getAttribute('href')).toContain('programar=1')

    await usuario.click(screen.getByRole('button', { name: 'Detener y trasladar' }))
    expect(registrar).not.toHaveBeenCalled()
    expect(screen.getByText('Escribe el motivo.')).toBeTruthy()

    await usuario.type(screen.getByLabelText(/^Motivo/), 'Ruido durante clases en las aulas Z201 a Z205.')
    await usuario.click(screen.getByRole('radio', { name: /Ciencias/ }))
    await usuario.click(screen.getByRole('button', { name: 'Detener y trasladar' }))
    expect(registrar).toHaveBeenCalledWith(1, {
      zona_afectada: 'Sociales',
      zona_alternativa: 'Ciencias',
      hora: '2026-11-17T10:15:00-05:00',
      motivo: 'Ruido durante clases en las aulas Z201 a Z205.',
      aviso_proveedor: true,
      registrar_restriccion: false,
    })
    expect(onRegistrada).toHaveBeenCalled()
  })
})
