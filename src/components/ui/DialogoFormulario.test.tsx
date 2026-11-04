// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import DialogoFormulario from './DialogoFormulario'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false
  }
})
afterEach(cleanup)

describe('DialogoFormulario', () => {
  it('con ancho lateral se pinta como panel y conserva título y acciones', () => {
    render(
      <DialogoFormulario abierto titulo="Programar ciclo" textoConfirmar="Programar ciclo" ancho="lateral" onEnviar={vi.fn()} onCerrar={vi.fn()}>
        <p>Campos</p>
      </DialogoFormulario>,
    )

    const dialogo = screen.getByRole('dialog', { name: 'Programar ciclo' })
    expect(dialogo.className).toMatch(/lateral/)
    expect(screen.getByRole('button', { name: 'Programar ciclo' })).toBeTruthy()
  })
})
