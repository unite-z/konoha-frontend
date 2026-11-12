// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import Icono, { NOMBRES_ICONOS_FIGMA, type NombreIcono } from './Icono'

afterEach(cleanup)

describe('Icono', () => {
  it('tiene los 46 iconos de la página de Figma, con su nombre', () => {
    expect(NOMBRES_ICONOS_FIGMA).toHaveLength(46)
    const { container } = render(
      <>
        {NOMBRES_ICONOS_FIGMA.map((nombre) => (
          <Icono key={nombre} nombre={nombre} />
        ))}
      </>,
    )
    expect(container.querySelectorAll('svg')).toHaveLength(46)
  })

  it.each(['circulo', 'verificacion', 'triangulo', 'aspa', 'flechaOrden', 'chevronDerecha', 'documento', 'destello'] as NombreIcono[])(
    'el nombre antiguo «%s» sigue pintando un icono',
    (nombre) => {
      const { container } = render(<Icono nombre={nombre} />)
      expect(container.querySelector('svg')).not.toBeNull()
    },
  )

  it('sin título es decorativo', () => {
    const { container } = render(<Icono nombre="house" />)

    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('con título se anuncia como imagen', () => {
    render(<Icono nombre="bell" titulo="Avisos" />)

    expect(screen.getByRole('img', { name: 'Avisos' })).toBeTruthy()
  })

  it('cada tamaño tiene su clase', () => {
    const { container } = render(
      <>
        <Icono nombre="x" tamano="sm" />
        <Icono nombre="x" tamano="base" />
        <Icono nombre="x" />
      </>,
    )

    const clases = Array.from(container.querySelectorAll('svg'), (svg) => svg.getAttribute('class'))
    expect(new Set(clases).size).toBe(3)
  })
})
