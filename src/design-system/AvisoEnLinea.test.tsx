// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AvisoEnLinea from './AvisoEnLinea'

afterEach(cleanup)

describe('AvisoEnLinea', () => {
  it.each(['info', 'exito', 'advertencia'] as const)('el tono %s se anuncia como estado', (tono) => {
    render(<AvisoEnLinea tono={tono} titulo="Coincide con 1 ciclo programado" />)

    expect(screen.getByRole('status').textContent).toContain('Coincide con 1 ciclo programado')
  })

  it('el tono error se anuncia como alerta', () => {
    render(
      <AvisoEnLinea tono="error" titulo="No pudimos guardar">
        Vuelve a intentarlo.
      </AvisoEnLinea>,
    )

    expect(screen.getByRole('alert').textContent).toContain('Vuelve a intentarlo.')
  })

  it('la acción es un botón que ejecuta su función', async () => {
    const usuario = userEvent.setup()
    const revisar = vi.fn()
    render(<AvisoEnLinea tono="advertencia" titulo="Aviso" accion={{ texto: 'Revisar ciclo', onClick: revisar }} />)

    await usuario.click(screen.getByRole('button', { name: 'Revisar ciclo' }))
    expect(revisar).toHaveBeenCalledTimes(1)
  })

  it('permite conservar la acción y cerrar el aviso mediante una X', async () => {
    const usuario = userEvent.setup()
    const revisar = vi.fn()
    const cerrar = vi.fn()
    render(
      <AvisoEnLinea
        tono="advertencia"
        titulo="Aviso"
        accion={{ texto: 'Revisar ciclo', onClick: revisar }}
        onCerrar={cerrar}
      />,
    )

    await usuario.click(screen.getByRole('button', { name: 'Revisar ciclo' }))
    await usuario.click(screen.getByRole('button', { name: 'Cerrar aviso' }))
    expect(revisar).toHaveBeenCalledTimes(1)
    expect(cerrar).toHaveBeenCalledTimes(1)
  })
})
