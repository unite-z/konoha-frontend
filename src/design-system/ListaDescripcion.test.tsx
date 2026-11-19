// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import ListaDescripcion from './ListaDescripcion'

afterEach(cleanup)

describe('ListaDescripcion', () => {
  it('pinta los pares como lista de descripción, con «—» si falta el valor y la variante en filas', () => {
    const { container } = render(
      <ListaDescripcion
        columnas="filas"
        elementos={[
          { etiqueta: 'Ubicación', valor: 'Jardín de la Biblioteca · Ciencias' },
          { etiqueta: 'Ejemplar', valor: null },
          false,
        ]}
      />,
    )
    const lista = container.querySelector('dl')
    expect(lista?.className).toMatch(/filas/)
    expect(screen.getByText('Ubicación').tagName).toBe('DT')
    expect(screen.getByText('Jardín de la Biblioteca · Ciencias').tagName).toBe('DD')
    expect(screen.getByText('—')).toBeTruthy()
  })
})
