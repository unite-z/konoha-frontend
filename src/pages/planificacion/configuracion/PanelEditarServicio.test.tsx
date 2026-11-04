// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { ServicioPeriodico } from '@/types/planificacion'
import PanelEditarServicio from './PanelEditarServicio'

const sello = { fecha_modificacion: '2026-10-28T09:12:00-05:00', modificado_por: 'Robert G.' }
const corte: ServicioPeriodico = {
  id: 1,
  nombre: 'Corte de césped',
  es_ruidoso: true,
  via: 'Tercerizado',
  proveedor: 'Servicios Verdes Demo S.A.C.',
  frecuencias: (['Verano', 'Otoño', 'Invierno', 'Primavera'] as const).map((estacion) => ({ estacion, frecuencia_teorica_dias: 21, frecuencia_practica_dias: 35, frecuencia_maxima_dias: 45, ...sello })),
  duracion: { duracion_maxima_dias: 3, dias_limpieza: 1, hora_inicio: null, hora_fin: null, ...sello },
}
const fito: ServicioPeriodico = { id: 2, nombre: 'Control fitosanitario', es_ruidoso: false, via: 'Tercerizado', proveedor: 'Fumigaciones Demo S.A.', frecuencias: [], duracion: null }

vi.mock('@/config/datosSimulados', () => ({ DATOS_SIMULADOS: true }))
vi.mock('@/utils/instanteLima', async (original) => ({ ...(await original<typeof import('@/utils/instanteLima')>()), hoyLima: () => '2026-11-04' }))
vi.mock('@/services/api/planificacion', () => ({
  listarProgramaciones: async () => [
    { id: 5, tipo_servicio_id: 1, servicio: 'Corte de césped', proveedor_id: 4, proveedor: 'Servicios Verdes Demo S.A.C.', estacion: 'Primavera', fecha_inicio_prevista: '2026-11-01', fecha_fin_prevista: '2026-11-04', estado: 'EnCurso', fecha_inicio_real: '2026-11-01', fecha_fin_real: null },
  ],
  obtenerValoresIniciales: async () => ({
    frecuencias: (['Verano', 'Otoño', 'Invierno', 'Primavera'] as const).map((estacion) => ({ estacion, frecuencia_teorica_dias: 90, frecuencia_practica_dias: 90, frecuencia_maxima_dias: 100 })),
    duracion: { duracion_maxima_dias: 1, dias_limpieza: 0, hora_inicio: '06:00', hora_fin: '18:00' },
  }),
  actualizarFrecuencia: vi.fn(),
  actualizarDuracion: vi.fn(),
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

describe('PanelEditarServicio (Figma 367-3334 y 367-3617)', () => {
  it('sin configurar, parte de los valores iniciales de la sección', async () => {
    render(<PanelEditarServicio servicio={fito} onCerrar={vi.fn()} onActualizado={vi.fn()} onGuardado={vi.fn()} />)

    expect(screen.getByText('Tercerizado · Fumigaciones Demo S.A.')).toBeTruthy()
    expect(screen.getByText('Sin configurar')).toBeTruthy()
    expect(screen.queryByText(/Última modificación/)).toBeNull()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Usar valores iniciales' }))
    expect((await screen.findByLabelText(/teórica en Verano/) as HTMLInputElement).value).toBe('90')
    expect((screen.getByLabelText(/^Hora de inicio/) as HTMLInputElement).value).toBe('06:00')
  })

  it('al cambiar avisa de que solo afecta a lo que se programe y de los ciclos que ya superan el máximo', async () => {
    const usuario = userEvent.setup()
    render(<PanelEditarServicio servicio={corte} onCerrar={vi.fn()} onActualizado={vi.fn()} onGuardado={vi.fn()} />)

    expect(screen.getByText('Tercerizado · Servicios Verdes Demo S.A.C. · ruidoso')).toBeTruthy()
    expect(screen.getByText('Última modificación: 28/10 · Robert G.')).toBeTruthy()
    const dias = screen.getByLabelText(/^Días de servicio/)
    await usuario.clear(dias)
    await usuario.type(dias, '2')
    expect(screen.getByText('Solo afecta a los ciclos que se programen a partir de ahora')).toBeTruthy()
    expect(await screen.findByText('1 ciclo en curso ya supera el nuevo máximo')).toBeTruthy()
    expect(screen.getByText('Al guardar se generará una alerta de duración excedida.')).toBeTruthy()
  })
})
