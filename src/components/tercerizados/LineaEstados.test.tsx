// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { CambioEstado, EstadoAtencion } from '@/types/tercerizados'
import { formatearFechaHora } from '@/utils/formato'
import LineaEstados from './LineaEstados'

afterEach(cleanup)

const fecha = '2026-11-10T19:41:00-05:00'
const cambio = (estado: EstadoAtencion): CambioEstado => ({
  estado_anterior: '', estado_nuevo: estado, usuario_id: 1,
  usuario_nombre: 'Responsable', fecha_hora: fecha,
})

describe('Línea de estados', () => {
  it.each([
    ['Requerimiento registrado', 0, 5],
    ['En ejecución', 2, 3],
    ['Observado', 5, 1],
  ] as const)('distingue completados, actual y pendientes en %s', (estado, completados, pendientes) => {
    render(<LineaEstados estado={estado} historial={[cambio(estado)]} />)
    const pasos = screen.getAllByRole('listitem')
    expect(pasos).toHaveLength(completados + pendientes + 1)
    expect(screen.queryAllByText('(completado)')).toHaveLength(completados)
    expect(screen.getAllByText('Pendiente')).toHaveLength(pendientes)
    const actual = pasos.find((paso) => paso.getAttribute('aria-current') === 'step')
    expect(actual).toBeDefined()
    if (!actual) throw new Error('Falta la etapa actual')
    expect(within(actual).getByText(estado)).toBeDefined()
    expect(within(actual).getByText(formatearFechaHora(fecha))).toBeDefined()
  })

  it('marca todos los pasos completados al cerrar y conserva la fecha de cierre', () => {
    render(<LineaEstados estado="Conforme / cerrado" historial={[cambio('Conforme / cerrado')]} />)
    const pasos = screen.getAllByRole('listitem')
    expect(pasos).toHaveLength(6)
    expect(screen.getAllByText('(completado)')).toHaveLength(6)
    expect(pasos.some((paso) => paso.hasAttribute('aria-current'))).toBe(false)
    const cierre = pasos[5]
    expect(within(cierre).getByText(formatearFechaHora(fecha))).toBeDefined()
    expect(within(cierre).queryByText('6')).toBeNull()
    expect(cierre.querySelector('svg')).not.toBeNull()
  })
})
