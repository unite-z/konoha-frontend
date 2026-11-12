// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AvisoTemporal from './AvisoTemporal'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('AvisoTemporal', () => {
  it('sin mensaje no pinta nada, pero la región viva existe', () => {
    render(<AvisoTemporal mensaje={null} onCerrar={() => {}} />)

    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('muestra mensaje y detalle y se cierra solo a los 6 segundos', () => {
    vi.useFakeTimers()
    const cerrar = vi.fn()
    render(<AvisoTemporal mensaje="Cambios guardados" detalle="Servicio actualizado." onCerrar={cerrar} />)

    expect(screen.getByRole('status').textContent).toContain('Cambios guardados')
    expect(screen.getByText('Servicio actualizado.')).toBeTruthy()
    act(() => vi.advanceTimersByTime(5999))
    expect(cerrar).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(cerrar).toHaveBeenCalledTimes(1)
  })

  it('el botón de cierre tiene nombre accesible y cierra', async () => {
    const usuario = userEvent.setup()
    const cerrar = vi.fn()
    render(<AvisoTemporal mensaje="No se pudo exportar" tono="error" onCerrar={cerrar} />)

    await usuario.click(screen.getByRole('button', { name: 'Cerrar aviso' }))
    expect(cerrar).toHaveBeenCalledTimes(1)
  })
})
