// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Restriccion } from '@/types/planificacion'
import { eventosDeCapas } from './calendarioCapas'
import VistaMovil from './VistaMovil'

afterEach(cleanup)

const jueves: Restriccion = {
  id: 1,
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
  serie: null,
}

describe('VistaMovil (Figma 352-2192)', () => {
  it('muestra la semana, marca el día elegido y cambia de semana y de día', async () => {
    const onCambiarFecha = vi.fn()
    const usuario = userEvent.setup()
    render(<VistaMovil fecha="2026-11-12" hoy="2026-11-04" eventos={eventosDeCapas([jueves], [])} onCambiarFecha={onCambiarFecha} />)

    expect(screen.getByRole('heading', { name: 'Noviembre 2026' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Jueves 12/ }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('heading', { name: 'Jue 12' })).toBeTruthy()
    expect(screen.getByText('Jueves culturales')).toBeTruthy()

    await usuario.click(screen.getByRole('button', { name: 'Semana siguiente' }))
    expect(onCambiarFecha).toHaveBeenLastCalledWith('2026-11-19')
    await usuario.click(screen.getByRole('button', { name: /Lunes 9/ }))
    expect(onCambiarFecha).toHaveBeenLastCalledWith('2026-11-09')
  })

  it('sin eventos en la semana lo dice', () => {
    render(<VistaMovil fecha="2026-11-26" hoy="2026-11-04" eventos={[]} onCambiarFecha={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Semana sin eventos' })).toBeTruthy()
  })
})
