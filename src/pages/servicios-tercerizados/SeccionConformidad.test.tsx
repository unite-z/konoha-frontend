// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Atencion, Conformidad } from '@/types/tercerizados'
import SeccionConformidad from './SeccionConformidad'

afterEach(cleanup)

function decision(id: number, cambios: Partial<Conformidad>): Conformidad {
  return {
    id,
    resultado: 'Observada',
    fecha_conformidad: '2026-01-05',
    comentarios: '',
    revision: 1,
    usuario_id: 1,
    usuario_nombre: 'Jefe',
    fecha_creacion: '2026-01-05T09:00:00-05:00',
    ...cambios,
  }
}

const atencion = (estado: Atencion['estado'], conformidades?: Conformidad[]) =>
  ({ id: 9, estado, conformidades }) as unknown as Atencion

describe('SeccionConformidad', () => {
  it('no aparece mientras el servicio no ha terminado', () => {
    const { container } = render(<SeccionConformidad atencion={atencion('En ejecución')} />)
    expect(container.firstChild).toBeNull()
  })

  it('sin decisiones (o con un back-end que aún no las envía) explica que falta', () => {
    render(<SeccionConformidad atencion={atencion('Reporte adjunto')} />)
    expect(screen.getByText('Aún no hay una decisión')).toBeTruthy()
  })

  it('muestra primero la decisión más reciente y la revisión que evaluó', () => {
    const decisiones = [
      decision(1, { resultado: 'Observada', revision: 1, comentarios: 'Falta el metrado' }),
      decision(2, { resultado: 'Conforme', revision: 2, fecha_conformidad: '2026-01-09' }),
    ]
    render(<SeccionConformidad atencion={atencion('Conforme / cerrado', decisiones)} />)

    const filas = screen.getAllByRole('row').slice(1)
    expect(within(filas[0]).getByText('Conforme')).toBeTruthy()
    expect(within(filas[0]).getByText('Revisión 2')).toBeTruthy()
    expect(within(filas[1]).getByText('Observada')).toBeTruthy()
    expect(within(filas[1]).getByText('Falta el metrado')).toBeTruthy()
  })
})
