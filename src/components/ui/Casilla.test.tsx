// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Casilla from './Casilla'

afterEach(cleanup)

describe('Casilla', () => {
  it('la etiqueta da nombre a la casilla y al pulsarla cambia el valor', async () => {
    const usuario = userEvent.setup()
    const cambiar = vi.fn()
    render(<Casilla etiqueta="Mantener la sesión iniciada" marcada={false} onCambiar={cambiar} />)

    await usuario.click(screen.getByText('Mantener la sesión iniciada'))
    expect(cambiar).toHaveBeenCalledWith(true)
  })

  it('refleja el valor marcado y se maneja con la barra espaciadora', async () => {
    const usuario = userEvent.setup()
    const cambiar = vi.fn()
    render(<Casilla etiqueta="Cuadrilla activa" marcada onCambiar={cambiar} />)

    const casilla = screen.getByRole('checkbox', { name: 'Cuadrilla activa' }) as HTMLInputElement
    expect(casilla.checked).toBe(true)
    casilla.focus()
    await usuario.keyboard(' ')
    expect(cambiar).toHaveBeenCalledWith(false)
  })

  it('la ayuda queda enlazada y deshabilitada no cambia', async () => {
    const usuario = userEvent.setup()
    const cambiar = vi.fn()
    render(<Casilla etiqueta="Atención a demanda" ayuda="El sector recibe incidencias sin ruta." marcada={false} onCambiar={cambiar} disabled />)

    const casilla = screen.getByRole('checkbox', { name: 'Atención a demanda' })
    const ayuda = screen.getByText('El sector recibe incidencias sin ruta.')
    expect(casilla.getAttribute('aria-describedby')).toBe(ayuda.id)
    await usuario.click(casilla)
    expect(cambiar).not.toHaveBeenCalled()
  })
})
