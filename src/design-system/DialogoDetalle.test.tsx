// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import DialogoDetalle from './DialogoDetalle'

// jsdom no implementa showModal ni close de <dialog>.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})

afterEach(cleanup)

describe('DialogoDetalle', () => {
  it('abierto, es un diálogo con nombre y descripción que muestra su contenido y se cierra con «Cerrar»', async () => {
    const onCerrar = vi.fn()
    render(
      <DialogoDetalle abierto titulo="Atenciones de la barra" descripcion="Octubre de 2026" onCerrar={onCerrar}>
        <p>Tres atenciones</p>
      </DialogoDetalle>,
    )

    const dialogo = screen.getByRole('dialog', { name: 'Atenciones de la barra' })
    expect(dialogo.getAttribute('aria-describedby')).toBeTruthy()
    expect(screen.getByText('Tres atenciones')).toBeTruthy()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onCerrar).toHaveBeenCalledTimes(1)
  })

  it('cerrado no pinta el contenido', () => {
    render(
      <DialogoDetalle abierto={false} titulo="Detalle" onCerrar={vi.fn()}>
        <p>Oculto</p>
      </DialogoDetalle>,
    )

    expect(screen.queryByText('Oculto')).toBeNull()
  })
})
