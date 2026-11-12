// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import Badge from './Badge'
import Estado, { type TonoEstado } from './Estado'

afterEach(cleanup)

const TONOS: TonoEstado[] = ['neutro', 'info', 'exito', 'aviso', 'error', 'acento']

describe('Estado', () => {
  it.each(TONOS)('el tono %s muestra siempre el texto: el color no es la única señal', (tono) => {
    render(<Estado tono={tono} texto="En atención" />)

    expect(screen.getByText('En atención')).toBeTruthy()
  })

  it('cada tono tiene su propio aspecto', () => {
    const { container } = render(
      <>
        {TONOS.map((tono) => (
          <Estado key={tono} tono={tono} texto={tono} />
        ))}
      </>,
    )

    const clases = new Set(Array.from(container.children, (hijo) => hijo.className))
    expect(clases.size).toBe(TONOS.length)
  })

  it('lleva punto decorativo por defecto y se puede quitar', () => {
    const { container, rerender } = render(<Estado tono="info" texto="Clasificada" />)
    const punto = container.querySelector('[aria-hidden="true"]')
    expect(punto).not.toBeNull()
    expect(punto?.textContent).toBe('')

    rerender(<Estado tono="info" texto="Clasificada" punto={false} />)
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull()
  })

  it('un icono sustituye al punto', () => {
    const { container } = render(<Estado tono="aviso" texto="Prohibida" icono="triangulo" />)

    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('la ayuda va en el title y también se anuncia', () => {
    render(<Estado tono="error" texto="Vencido" ayuda="Superó el plazo de 72 h" />)

    expect(screen.getByTitle('Superó el plazo de 72 h')).toBeTruthy()
    expect(screen.getByText(/Superó el plazo de 72 h/).className).toBe('sr-only')
  })
})

describe('Badge (nombre antiguo de Estado)', () => {
  it.each([
    ['neutral', 'neutro'],
    ['advertencia', 'aviso'],
    ['exito', 'exito'],
  ] as const)('el tono %s pinta un Estado %s', (tonoBadge, tonoEstado) => {
    const { container } = render(
      <>
        <Badge tono={tonoBadge} texto="a" />
        <Estado tono={tonoEstado} texto="b" />
      </>,
    )

    const [badge, estado] = Array.from(container.children)
    expect(badge.className).toBe(estado.className)
  })
})
