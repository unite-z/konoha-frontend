// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import Pestanas from './Pestanas'

afterEach(cleanup)

function Bandeja() {
  const [valor, setValor] = useState('todas')
  return (
    <Pestanas
      etiqueta="Estado de las incidencias"
      valor={valor}
      onCambiar={setValor}
      pestanas={[
        { valor: 'todas', texto: 'Todas', contador: 19 },
        { valor: 'abiertas', texto: 'Abiertas', contador: 2 },
        { valor: 'cerradas', texto: 'Cerradas' },
      ]}
    >
      <p>Panel {valor}</p>
    </Pestanas>
  )
}

describe('Pestanas', () => {
  it('marca la activa, muestra el contador y solo la activa está en el orden de tabulación', () => {
    render(<Bandeja />)

    const todas = screen.getByRole('tab', { name: 'Todas 19' })
    const abiertas = screen.getByRole('tab', { name: 'Abiertas 2' })
    expect(todas.getAttribute('aria-selected')).toBe('true')
    expect(todas.tabIndex).toBe(0)
    expect(abiertas.tabIndex).toBe(-1)
    expect(screen.getByRole('tabpanel', { name: 'Todas 19' }).textContent).toBe('Panel todas')
  })

  it('cambia con el ratón y con las flechas, Inicio y Fin', async () => {
    const usuario = userEvent.setup()
    render(<Bandeja />)

    await usuario.click(screen.getByRole('tab', { name: 'Abiertas 2' }))
    expect(screen.getByRole('tabpanel').textContent).toBe('Panel abiertas')

    await usuario.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Cerradas' }).getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Cerradas' }))

    await usuario.keyboard('{ArrowRight}')
    expect(screen.getByRole('tabpanel').textContent).toBe('Panel todas')

    await usuario.keyboard('{End}')
    expect(screen.getByRole('tabpanel').textContent).toBe('Panel cerradas')
    await usuario.keyboard('{Home}')
    expect(screen.getByRole('tabpanel').textContent).toBe('Panel todas')
  })
})
