// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FilaChecklist from './FilaChecklist'

afterEach(cleanup)

describe('FilaChecklist', () => {
  it('toda la fila es un botón que anuncia el estado y responde al toque', async () => {
    const onPulsar = vi.fn()
    render(<FilaChecklist titulo="J-016 · Talud de Química" detalle="Ciencias" estado="Pendiente" onPulsar={onPulsar} />)

    await userEvent.setup().click(screen.getByRole('button', { name: /^J-016 · Talud de Química, pendiente/ }))
    expect(onPulsar).toHaveBeenCalledTimes(1)
  })

  it('sin sincronizar lleva el check y el detalle en aviso, como en Figma 351-316', () => {
    render(<FilaChecklist titulo="J-017 · Jardín de Ingeniería" detalle="11:21 · se enviará al tener conexión" estado="Sin sincronizar" onPulsar={vi.fn()} />)

    const fila = screen.getByRole('button', { name: /J-017 · Jardín de Ingeniería, sin sincronizar/ })
    expect(fila.className).toMatch(/sinSincronizar/)
    expect(fila.querySelector('svg')).toBeTruthy()
  })

  it('deshabilitada no responde (mientras se envía la marca)', async () => {
    const onPulsar = vi.fn()
    render(<FilaChecklist titulo="J-018 · Patio" detalle="Ciencias" estado="Pendiente" onPulsar={onPulsar} deshabilitada />)

    await userEvent.setup().click(screen.getByRole('button', { name: /J-018/ }))
    expect(onPulsar).not.toHaveBeenCalled()
  })
})
