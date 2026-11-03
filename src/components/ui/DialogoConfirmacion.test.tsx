// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import DialogoConfirmacion from './DialogoConfirmacion'

// jsdom no implementa showModal ni close: lo mínimo para abrir, cerrar y emitir «close».
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

function abrir(props: Partial<Parameters<typeof DialogoConfirmacion>[0]> = {}) {
  const onConfirmar = vi.fn()
  const onCancelar = vi.fn()
  const utilidades = render(
    <DialogoConfirmacion
      abierto
      titulo="Cancelar CC-2026-11"
      consecuencia="El ciclo queda cancelado y se mantiene en el historial."
      textoConfirmar="Cancelar ciclo"
      variante="destructivo"
      onConfirmar={onConfirmar}
      onCancelar={onCancelar}
      {...props}
    />,
  )
  return { onConfirmar, onCancelar, ...utilidades }
}

describe('DialogoConfirmacion', () => {
  it('es un diálogo con título como nombre y consecuencia como descripción', () => {
    abrir()

    const dialogo = screen.getByRole('dialog', { name: 'Cancelar CC-2026-11' })
    const descripcion = document.getElementById(dialogo.getAttribute('aria-describedby') ?? '')
    expect(descripcion?.textContent).toBe('El ciclo queda cancelado y se mantiene en el historial.')
  })

  it('«Volver» no se confunde con la acción y cada botón llama a lo suyo', async () => {
    const usuario = userEvent.setup()
    const { onConfirmar, onCancelar } = abrir()

    await usuario.click(screen.getByRole('button', { name: 'Volver' }))
    expect(onCancelar).toHaveBeenCalledTimes(1)
    await usuario.click(screen.getByRole('button', { name: 'Cancelar ciclo' }))
    expect(onConfirmar).toHaveBeenCalledTimes(1)
  })

  it('el texto de salida se puede cambiar', () => {
    abrir({ textoVolver: 'Seguir editando' })

    expect(screen.getByRole('button', { name: 'Seguir editando' })).toBeTruthy()
  })

  it('Esc cierra, salvo mientras la acción está en curso', () => {
    const { onCancelar, rerender } = abrir()
    const dialogo = screen.getByRole('dialog')

    fireEvent(dialogo, new Event('cancel', { cancelable: true }))
    expect(onCancelar).toHaveBeenCalledTimes(1)

    rerender(
      <DialogoConfirmacion
        abierto
        cargando
        titulo="Cancelar CC-2026-11"
        consecuencia="El ciclo queda cancelado."
        textoConfirmar="Cancelar ciclo"
        onConfirmar={() => {}}
        onCancelar={onCancelar}
      />,
    )
    fireEvent(dialogo, new Event('cancel', { cancelable: true }))
    expect(onCancelar).toHaveBeenCalledTimes(1)
  })

  it('al cerrarse devuelve el foco al botón que lo abrió', () => {
    const disparador = document.createElement('button')
    document.body.append(disparador)
    disparador.focus()
    const { rerender } = abrir({ abierto: false })

    rerender(
      <DialogoConfirmacion abierto titulo="T" consecuencia="C" textoConfirmar="Hacer" onConfirmar={() => {}} onCancelar={() => {}} />,
    )
    rerender(
      <DialogoConfirmacion abierto={false} titulo="T" consecuencia="C" textoConfirmar="Hacer" onConfirmar={() => {}} onCancelar={() => {}} />,
    )
    expect(document.activeElement).toBe(disparador)
    disparador.remove()
  })
})
