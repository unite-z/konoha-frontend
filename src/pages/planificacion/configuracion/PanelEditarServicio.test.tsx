// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { ServicioPeriodico } from '@/types/planificacion'
import PanelEditarServicio from './PanelEditarServicio'
import { actualizarDuracion, actualizarFrecuencia } from '@/services/api/planificacion'

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

vi.mock('@/utils/instanteLima', async (original) => ({ ...(await original<typeof import('@/utils/instanteLima')>()), hoyLima: () => '2026-11-04' }))
vi.mock('@/services/api/planificacion', () => ({
  listarProgramaciones: async () => [
    { id: 5, tipo_servicio_id: 1, servicio: 'Corte de césped', proveedor_id: 4, proveedor: 'Servicios Verdes Demo S.A.C.', estacion: 'Primavera', fecha_inicio_prevista: '2026-11-01', fecha_fin_prevista: '2026-11-04', estado: 'EnCurso', fecha_inicio_real: '2026-11-01', fecha_fin_real: null },
  ],
  obtenerValoresIniciales: async () => ({
    frecuencias: (['Verano', 'Otoño', 'Invierno', 'Primavera'] as const).map((estacion) => ({ estacion, frecuencia_teorica_dias: 90, frecuencia_practica_dias: 90, frecuencia_maxima_dias: 100 })),
    duracion: { duracion_maxima_dias: 1, dias_limpieza: 0, hora_inicio: '06:00', hora_fin: '18:00' },
  }),
  listarHistorialServicio: async () => [
    { campo: 'duracion_maxima_dias', estacion: null, anterior: '4', nuevo: '3', fecha_hora: '2026-10-28T09:12:00-05:00', autor: 'Robert G.' },
    { campo: 'inicial', estacion: null, anterior: null, nuevo: null, fecha_hora: '2026-10-14T11:05:00-05:00', autor: 'Robert G.' },
  ],
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
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('PanelEditarServicio (Figma 367-3334 y 367-3617)', () => {
  it.each(['teórica', 'práctica', 'máxima'])('rechaza una frecuencia %s negativa sin transformarla en positiva', async (campo) => {
    const usuario = userEvent.setup()
    render(<PanelEditarServicio servicio={corte} onCerrar={vi.fn()} onActualizado={vi.fn()} onGuardado={vi.fn()} />)
    const control = screen.getByLabelText(new RegExp(`Frecuencia ${campo} en Primavera`))
    await usuario.clear(control)
    await usuario.type(control, '-1')
    expect((control as HTMLInputElement).value).toBe('-1')
    const guardar = screen.getByRole('button', { name: 'Guardar cambios' })
    expect(guardar.getAttribute('aria-disabled')).toBe('true')
    await usuario.click(guardar)
    expect(actualizarFrecuencia).not.toHaveBeenCalled()
    expect(actualizarDuracion).not.toHaveBeenCalled()
  })

  it.each(['1.5', '2,5', 'abc'])('rechaza el formato de frecuencia %j sin transformarlo en otro intervalo', async (valor) => {
    const usuario = userEvent.setup()
    render(<PanelEditarServicio servicio={corte} onCerrar={vi.fn()} onActualizado={vi.fn()} onGuardado={vi.fn()} />)
    const control = screen.getByLabelText(/Frecuencia teórica en Primavera/)
    await usuario.clear(control)
    await usuario.type(control, valor)
    expect((control as HTMLInputElement).value).toBe(valor)
    const guardar = screen.getByRole('button', { name: 'Guardar cambios' })
    expect(guardar.getAttribute('aria-disabled')).toBe('true')
    await usuario.click(guardar)
    expect(actualizarFrecuencia).not.toHaveBeenCalled()
  })

  it('guarda solo la estación modificada y conserva la duración de RF-PLA-002', async () => {
    const actualizado = { ...corte, frecuencias: corte.frecuencias.map((f) => f.estacion === 'Primavera' ? { ...f, frecuencia_practica_dias: 40 } : f) }
    vi.mocked(actualizarFrecuencia).mockResolvedValueOnce(actualizado)
    const guardado = vi.fn()
    const usuario = userEvent.setup()
    render(<PanelEditarServicio servicio={corte} onCerrar={vi.fn()} onActualizado={vi.fn()} onGuardado={guardado} />)
    const practica = screen.getByLabelText('Frecuencia práctica en Primavera (días)')
    await usuario.clear(practica)
    await usuario.type(practica, '40')
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(actualizarFrecuencia).toHaveBeenCalledExactlyOnceWith(1, 'Primavera', { frecuencia_teorica_dias: 21, frecuencia_practica_dias: 40, frecuencia_maxima_dias: 45 })
    expect(actualizarDuracion).not.toHaveBeenCalled()
    expect(guardado).toHaveBeenCalledWith(actualizado)
  })

  it.each(['', '0', '-1'])('impide guardar la duración inválida %j sin llamar a la API', async (valor) => {
    const usuario = userEvent.setup()
    render(<PanelEditarServicio servicio={corte} onCerrar={vi.fn()} onActualizado={vi.fn()} onGuardado={vi.fn()} />)
    const dias = screen.getByLabelText(/^Días de servicio/)
    await usuario.clear(dias)
    if (valor) await usuario.type(dias, valor)
    const guardar = screen.getByRole('button', { name: 'Guardar cambios' }) as HTMLButtonElement
    expect(guardar.getAttribute('aria-disabled')).toBe('true')
    await usuario.click(guardar)
    expect(actualizarDuracion).not.toHaveBeenCalled()
  })

  it('incluye los días de limpieza al decidir si el ciclo supera el nuevo máximo (RN-002)', async () => {
    const usuario = userEvent.setup()
    render(<PanelEditarServicio servicio={corte} onCerrar={vi.fn()} onActualizado={vi.fn()} onGuardado={vi.fn()} />)
    const servicio = screen.getByLabelText(/^Días de servicio/)
    await usuario.clear(servicio)
    await usuario.type(servicio, '2')
    const limpieza = screen.getByLabelText(/^Días de limpieza/)
    await usuario.clear(limpieza)
    await usuario.type(limpieza, '2')
    expect(screen.getByRole('button', { name: 'Guardar cambios' }).getAttribute('aria-disabled')).not.toBe('true')
    expect(screen.queryByText(/ciclo en curso ya supera/)).toBeNull()
  })

  it('guarda una duración positiva con limpieza y devuelve el servicio actualizado', async () => {
    const actualizado = { ...corte, duracion: { ...sello, duracion_maxima_dias: 4, dias_limpieza: 1, hora_inicio: null, hora_fin: null } }
    vi.mocked(actualizarDuracion).mockResolvedValueOnce(actualizado)
    const guardado = vi.fn()
    const usuario = userEvent.setup()
    render(<PanelEditarServicio servicio={corte} onCerrar={vi.fn()} onActualizado={vi.fn()} onGuardado={guardado} />)
    const dias = screen.getByLabelText(/^Días de servicio/)
    await usuario.clear(dias)
    await usuario.type(dias, '4')
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(actualizarDuracion).toHaveBeenCalledWith(1, { duracion_maxima_dias: 4, dias_limpieza: 1 })
    expect(guardado).toHaveBeenCalledWith(actualizado)
  })
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

  it('«Ver historial» abre el historial de cambios del servicio (Figma 367-3527)', async () => {
    render(<PanelEditarServicio servicio={corte} onCerrar={vi.fn()} onActualizado={vi.fn()} onGuardado={vi.fn()} />)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Ver historial' }))
    expect(screen.getByRole('dialog', { name: 'Historial de cambios' })).toBeTruthy()
    expect(await screen.findByText('Duración: 4 → 3 días de servicio')).toBeTruthy()
    expect(screen.getByText('28/10/2026 09:12 · Robert G.')).toBeTruthy()
    expect(screen.getByText('Configuración inicial')).toBeTruthy()
  })
})
