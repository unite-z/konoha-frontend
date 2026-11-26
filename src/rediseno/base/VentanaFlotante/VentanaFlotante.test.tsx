// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import PanelLateral from '../PanelLateral/PanelLateral'
import VentanaFlotante from './VentanaFlotante'

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

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

/** Esc en un `<dialog>` modal: el navegador emite `cancel` (jsdom no lo hace). */
function pulsarEsc(dialogo: HTMLElement) {
  dialogo.dispatchEvent(new Event('cancel', { cancelable: true }))
}

/** La ventana dentro del panel, como la usan los módulos; `pie` añade controles tras ella. */
function Prueba({ onCerrarPanel = () => {} }: { onCerrarPanel?: () => void }) {
  const [ventana, setVentana] = useState(false)
  return (
    <PanelLateral abierto onCerrar={onCerrarPanel} titulo="Área 7">
      <button onClick={() => setVentana(true)}>Ver plano</button>
      <VentanaFlotante
        abierto={ventana}
        titulo="Plano del área"
        descripcion="Vista en planta"
        onCerrar={() => setVentana(false)}
      >
        <button>Dentro</button>
      </VentanaFlotante>
    </PanelLateral>
  )
}

describe('VentanaFlotante', () => {
  it('se abre sobre el panel sin cerrarlo, con nombre y descripción', async () => {
    render(<Prueba />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ver plano' }))
    const ventana = screen.getByRole('dialog', { name: 'Plano del área' })
    expect(ventana.getAttribute('aria-describedby')).toBeTruthy()
    expect(screen.getByText('Vista en planta')).toBeTruthy()
    expect(screen.getByRole('complementary', { name: 'Área 7' })).toBeTruthy()
  })

  it('Esc la cierra, deja el panel abierto y el foco vuelve al botón que la abrió', async () => {
    const onCerrarPanel = vi.fn()
    render(<Prueba onCerrarPanel={onCerrarPanel} />)
    const origen = screen.getByRole('button', { name: 'Ver plano' })
    await userEvent.setup().click(origen)
    const dentro = screen.getByRole('button', { name: 'Dentro' })
    dentro.focus()
    // La tecla llega primero al control enfocado y sube hasta el panel; después el navegador emite `cancel`.
    fireEvent.keyDown(dentro, { key: 'Escape' })
    pulsarEsc(screen.getByRole('dialog', { name: 'Plano del área' }))
    await Promise.resolve()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onCerrarPanel).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(origen)
  })

  it('la X «Cerrar ventana» también la cierra y devuelve el foco', async () => {
    render(<Prueba />)
    const usuario = userEvent.setup()
    const origen = screen.getByRole('button', { name: 'Ver plano' })
    await usuario.click(origen)
    await usuario.click(screen.getByRole('button', { name: 'Cerrar ventana' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(origen)
  })

  it('en la hoja móvil, el Tab dentro de la ventana no lo desvía la trampa del panel', async () => {
    vi.stubGlobal('matchMedia', (consulta: string) => ({
      matches: consulta.includes('max-width'),
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    render(<Prueba />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ver plano' }))
    const dentro = screen.getByRole('button', { name: 'Dentro' })
    dentro.focus()
    // «Dentro» es el último enfocable del panel: sin la excepción, el panel llevaría el foco a su X, que está inerte.
    expect(fireEvent.keyDown(dentro, { key: 'Tab' })).toBe(true)
  })

  it('con movimiento, espera a la animación de salida antes de cerrarse', async () => {
    vi.stubGlobal('matchMedia', (consulta: string) => ({
      matches: consulta.includes('no-preference'),
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    const onCerrar = vi.fn()
    render(
      <VentanaFlotante abierto titulo="Plano" onCerrar={onCerrar}>
        <p>Contenido</p>
      </VentanaFlotante>,
    )
    const ventana = screen.getByRole('dialog', { name: 'Plano' })
    pulsarEsc(ventana)
    await Promise.resolve()
    expect(onCerrar).not.toHaveBeenCalled()
    fireEvent.animationEnd(ventana)
    expect(onCerrar).toHaveBeenCalledTimes(1)
  })

  it('si el módulo la desmonta abierta, el foco vuelve al origen', async () => {
    function Desmontable() {
      const [montada, setMontada] = useState(false)
      return (
        <>
          <button onClick={() => setMontada(true)}>Abrir</button>
          {montada && (
            <VentanaFlotante abierto titulo="Plano" onCerrar={() => {}}>
              <button onClick={() => setMontada(false)}>Quitar</button>
            </VentanaFlotante>
          )}
        </>
      )
    }
    render(<Desmontable />)
    const usuario = userEvent.setup()
    const origen = screen.getByRole('button', { name: 'Abrir' })
    await usuario.click(origen)
    await usuario.click(screen.getByRole('button', { name: 'Quitar' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(origen)
  })

  it('cerrada no pinta el contenido', () => {
    render(
      <VentanaFlotante abierto={false} titulo="Plano" onCerrar={() => {}}>
        <p>Oculto</p>
      </VentanaFlotante>,
    )
    expect(screen.queryByText('Oculto')).toBeNull()
  })
})
