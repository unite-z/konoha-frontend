// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Paginacion, { paginasVisibles } from './Paginacion'

afterEach(cleanup)

describe('paginasVisibles', () => {
  it.each([
    [1, 13, [1, 2, 3]],
    [2, 13, [1, 2, 3]],
    [7, 13, [6, 7, 8]],
    [13, 13, [11, 12, 13]],
    [1, 1, [1]],
    [2, 2, [1, 2]],
  ])('página %i de %i → %j', (pagina, total, esperado) => {
    expect(paginasVisibles(pagina, total)).toEqual(esperado)
  })
})

describe('Paginacion', () => {
  it('resume el tramo visible y marca la página actual', () => {
    render(<Paginacion pagina={2} porPagina={10} total={128} onCambiar={() => {}} />)

    expect(screen.getByText('Mostrando 11 a 20 de 128')).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'Paginación' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Página 2' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('button', { name: 'Página 1' }).hasAttribute('aria-current')).toBe(false)
  })

  it('Anterior, Siguiente y los números cambian de página; la actual no', async () => {
    const usuario = userEvent.setup()
    const cambiar = vi.fn()
    render(<Paginacion pagina={2} porPagina={10} total={128} onCambiar={cambiar} />)

    await usuario.click(screen.getByRole('button', { name: 'Anterior' }))
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    await usuario.click(screen.getByRole('button', { name: 'Página 3' }))
    await usuario.click(screen.getByRole('button', { name: 'Página 2' }))
    expect(cambiar.mock.calls).toEqual([[1], [3], [3]])
  })

  it('en la primera y la última página deshabilita el botón que no lleva a ningún sitio', () => {
    const { rerender } = render(<Paginacion pagina={1} porPagina={10} total={128} onCambiar={() => {}} />)
    expect(screen.getByRole('button', { name: 'Anterior' }).getAttribute('aria-disabled')).toBe('true')
    expect(screen.getByRole('button', { name: 'Siguiente' }).hasAttribute('aria-disabled')).toBe(false)

    rerender(<Paginacion pagina={13} porPagina={10} total={128} onCambiar={() => {}} />)
    expect(screen.getByText('Mostrando 121 a 128 de 128')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Siguiente' }).getAttribute('aria-disabled')).toBe('true')
  })
})
