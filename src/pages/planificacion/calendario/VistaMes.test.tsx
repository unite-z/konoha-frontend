// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Programacion } from '@/types/planificacion'
import { eventosDeCapas, semanasDelMes } from './calendarioCapas'
import VistaMes from './VistaMes'

afterEach(cleanup)

function actividad(id: number): Programacion {
  return {
    id,
    tipo_servicio_id: 1,
    servicio: `Servicio ${id}`,
    proveedor_id: null,
    proveedor: null,
    estacion: 'Primavera',
    fecha_inicio_prevista: '2026-11-04',
    fecha_fin_prevista: '2026-11-04',
    estado: 'Programada',
    fecha_inicio_real: null,
    fecha_fin_real: null,
  }
}

function pintar(onSeleccionar = vi.fn()) {
  render(
    <VistaMes
      semanas={semanasDelMes({ anio: 2026, mes: 11 })}
      eventos={eventosDeCapas([], [1, 2, 3, 4].map(actividad))}
      mes="2026-11"
      hoy="2026-11-04"
      seleccionado="2026-11-12"
      onSeleccionar={onSeleccionar}
    />,
  )
  return onSeleccionar
}

describe('VistaMes', () => {
  it('nombra cada día con lo que tiene, marca hoy y el seleccionado', () => {
    pintar()

    const hoy = screen.getByRole('button', { name: 'miércoles 4, 4 actividades' })
    expect(hoy.getAttribute('aria-current')).toBe('date')
    expect(screen.getByRole('button', { name: 'jueves 12' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('+1 más')).toBeTruthy()
  })

  it('al pulsar un día lo selecciona', async () => {
    const onSeleccionar = pintar()

    await userEvent.setup().click(screen.getByRole('button', { name: 'viernes 20' }))
    expect(onSeleccionar).toHaveBeenCalledWith('2026-11-20')
  })
})
