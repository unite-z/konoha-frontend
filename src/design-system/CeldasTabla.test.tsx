// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { SIN_VALOR } from '@/utils/formato'
import { CeldaDobleLinea, CeldaTexto } from './CeldasTabla'

afterEach(cleanup)

describe('CeldaTexto', () => {
  it('cada tono tiene su aspecto y destacado lo cambia', () => {
    const { container } = render(
      <>
        <CeldaTexto texto="a" />
        <CeldaTexto texto="b" tono="secundario" />
        <CeldaTexto texto="c" tono="deshabilitado" />
        <CeldaTexto texto="d" tono="aviso" />
        <CeldaTexto texto="e" destacado />
      </>,
    )

    expect(new Set(Array.from(container.children, (c) => c.className)).size).toBe(5)
  })

  it('sin valor muestra el marcador de vacío en tono deshabilitado', () => {
    const { container } = render(
      <>
        <CeldaTexto texto="" destacado />
        <CeldaTexto texto="x" tono="deshabilitado" />
      </>,
    )

    const [vacia, deshabilitada] = Array.from(container.children)
    expect(vacia.textContent).toBe(SIN_VALOR)
    expect(vacia.className).toBe(deshabilitada.className)
  })
})

describe('CeldaDobleLinea', () => {
  it('pinta las dos líneas; con código, el detalle va en otro estilo', () => {
    const { container } = render(
      <>
        <CeldaDobleLinea principal="Rama caída" detalle="Jardín Central" />
        <CeldaDobleLinea principal="Rama caída" detalle="INC-2026-041" codigo />
      </>,
    )

    expect(screen.getByText('INC-2026-041')).toBeTruthy()
    const [normal, conCodigo] = Array.from(container.children)
    expect(normal.lastElementChild?.className).not.toBe(conCodigo.lastElementChild?.className)
  })
})
