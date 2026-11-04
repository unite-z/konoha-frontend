// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import CampoFormulario, { AreaTexto, ResumenErrores } from './CampoFormulario'

afterEach(cleanup)

describe('CampoFormulario', () => {
  it('la etiqueta da nombre al control y el obligatorio se anuncia', () => {
    render(<CampoFormulario id="correo" etiqueta="Correo institucional" obligatorio />)

    const campo = screen.getByRole('textbox', { name: /Correo institucional/ })
    expect(campo.getAttribute('aria-required')).toBe('true')
  })

  it('la ayuda va debajo del control y queda enlazada', () => {
    const { container } = render(<CampoFormulario id="dni" etiqueta="DNI" ayuda="Ocho cifras." />)

    const campo = screen.getByRole('textbox', { name: 'DNI' })
    const ayuda = screen.getByText('Ocho cifras.')
    expect(campo.getAttribute('aria-describedby')).toBe('dni-ayuda')
    expect(campo.compareDocumentPosition(ayuda) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(container.querySelector('label')?.compareDocumentPosition(campo)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('el error marca el campo como inválido y se anuncia con la ayuda', () => {
    render(<CampoFormulario id="dni" etiqueta="DNI" ayuda="Ocho cifras." error="Escribe ocho cifras." />)

    const campo = screen.getByRole('textbox', { name: 'DNI' })
    expect(campo.getAttribute('aria-invalid')).toBe('true')
    expect(campo.getAttribute('aria-describedby')).toBe('dni-ayuda dni-error')
  })

  it('bloqueado: solo lectura, con el motivo enlazado', async () => {
    const usuario = userEvent.setup()
    render(<CampoFormulario id="rol" etiqueta="Rol" bloqueadoMotivo="Lo asigna el jefe de sección." defaultValue="Capataz" />)

    const campo = screen.getByRole('textbox', { name: 'Rol' })
    await usuario.type(campo, 'x')
    expect((campo as HTMLInputElement).value).toBe('Capataz')
    expect(campo.getAttribute('aria-describedby')).toBe('rol-bloqueo')
  })

  it('AreaTexto también tiene etiqueta y error', () => {
    render(<AreaTexto id="motivo" etiqueta="Motivo" error="Escribe el motivo." />)

    expect(screen.getByRole('textbox', { name: 'Motivo' }).getAttribute('aria-invalid')).toBe('true')
  })

  it('el resumen de errores enlaza cada campo y no se pinta si no hay errores', () => {
    const { rerender } = render(
      <ResumenErrores titulo="Revisa 1 campo" errores={[{ idCampo: 'dni', mensaje: 'Escribe ocho cifras.' }]} />,
    )
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Escribe ocho cifras.' }).getAttribute('href')).toBe('#dni')

    rerender(<ResumenErrores titulo="Revisa" errores={[]} />)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('con formato entero no deja escribir ni pegar letras', async () => {
    function Campo() {
      const [valor, setValor] = useState('')
      return <CampoFormulario id="dias" etiqueta="Días" formato="entero" value={valor} onChange={(e) => setValor(e.target.value)} />
    }
    render(<Campo />)
    const campo = screen.getByLabelText('Días') as HTMLInputElement
    expect(campo.inputMode).toBe('numeric')

    const usuario = userEvent.setup()
    await usuario.type(campo, '1a2')
    expect(campo.value).toBe('12')
    await usuario.clear(campo)
    await usuario.click(campo)
    await usuario.paste('3 días')
    expect(campo.value).toBe('3')
  })
})
