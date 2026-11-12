// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import EventoCalendario from './EventoCalendario'

afterEach(cleanup)

describe('EventoCalendario', () => {
  it('pinta el punto solo en las actividades', () => {
    const { container, rerender } = render(<EventoCalendario tipo="programada" texto="Poda B" />)
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()

    rerender(<EventoCalendario tipo="prohibicion" texto="Examen" />)
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull()
  })

  it('deja el texto completo en el title para cuando se recorta', () => {
    render(<EventoCalendario tipo="aviso" texto="Jueves culturales · Sociales y Comedor Central" />)

    expect(screen.getByTitle('Jueves culturales · Sociales y Comedor Central').textContent).toBe(
      'Jueves culturales · Sociales y Comedor Central',
    )
  })

  it('con ajustar, el texto pasa a varias líneas', () => {
    const { container } = render(<EventoCalendario tipo="programada" texto="Encargo · Cuad. C" ajustar />)

    expect(container.firstElementChild?.className).toMatch(/ajustar/)
  })

  it('pinta como barra una actividad de varios días', () => {
    const { container } = render(<EventoCalendario tipo="enCurso" texto="Corte de césped" barra />)

    expect(container.firstElementChild?.className).toMatch(/barra/)
  })
})
