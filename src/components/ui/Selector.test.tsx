// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CampoFormulario from './CampoFormulario'
import Selector from './Selector'

afterEach(cleanup)

const SECTORES = [
  { valor: 'ciencias', texto: 'Ciencias' },
  { valor: 'letras', texto: 'Letras' },
]

describe('Selector (Desplegable · campo)', () => {
  it('es un desplegable nativo con su etiqueta y cambia de valor', async () => {
    const usuario = userEvent.setup()
    const cambiar = vi.fn()
    render(<Selector id="sector" etiqueta="Sector" valor="" opciones={SECTORES} onCambiar={cambiar} opcionTodos="Todos" />)

    const desplegable = screen.getByRole('combobox', { name: 'Sector' })
    await usuario.selectOptions(desplegable, 'letras')
    expect(cambiar).toHaveBeenCalledWith('letras')
  })

  it('sin valor se marca como vacío; con valor, no', () => {
    const { rerender } = render(<Selector id="s" etiqueta="Sector" valor="" opciones={SECTORES} onCambiar={vi.fn()} opcionTodos="Todos" />)
    expect(screen.getByRole('combobox').hasAttribute('data-vacio')).toBe(true)

    rerender(<Selector id="s" etiqueta="Sector" valor="ciencias" opciones={SECTORES} onCambiar={vi.fn()} />)
    expect(screen.getByRole('combobox').hasAttribute('data-vacio')).toBe(false)
  })

  it('el icono de flecha es decorativo y bloqueado deshabilita el control', () => {
    const { container } = render(
      <Selector id="s" etiqueta="Sector" valor="ciencias" opciones={SECTORES} onCambiar={vi.fn()} bloqueadoMotivo="Lo fija el contrato." />,
    )

    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    expect((screen.getByRole('combobox', { name: 'Sector' }) as HTMLSelectElement).disabled).toBe(true)
  })
})

describe('Campo compacto y campos de fecha y hora', () => {
  it('compacto cambia el aspecto, no el comportamiento', () => {
    render(
      <>
        <CampoFormulario id="a" etiqueta="Cantidad" />
        <CampoFormulario id="b" etiqueta="Cantidad compacta" compacto />
        <Selector id="c" etiqueta="Sector compacto" valor="" opciones={SECTORES} onCambiar={vi.fn()} compacto />
      </>,
    )

    const normal = screen.getByRole('textbox', { name: 'Cantidad' })
    const compacto = screen.getByRole('textbox', { name: 'Cantidad compacta' })
    expect(compacto.className).not.toBe(normal.className)
    expect(compacto.hasAttribute('compacto')).toBe(false)
    expect(screen.getByRole('combobox', { name: 'Sector compacto' }).hasAttribute('compacto')).toBe(false)
  })

  it('Campo · fecha y Campo · hora son inputs nativos con su etiqueta', () => {
    const { container } = render(
      <>
        <CampoFormulario id="desde" etiqueta="Desde" type="date" obligatorio />
        <CampoFormulario id="hora" etiqueta="Hora de inicio" type="time" />
      </>,
    )

    expect(container.querySelector('#desde')?.getAttribute('type')).toBe('date')
    expect(screen.getByLabelText(/Desde/).getAttribute('aria-required')).toBe('true')
    expect(screen.getByLabelText('Hora de inicio').getAttribute('type')).toBe('time')
  })

  it('con idErrorExterno, el desplegable queda en error y enlaza el texto de fuera sin repetir el mensaje', () => {
    render(
      <>
        <Selector id="capataz" etiqueta="Capataz" valor="" opcionTodos="Sin capataz libre el 01/11" opciones={[]} onCambiar={vi.fn()} error="Sin capataz libre el 01/11" idErrorExterno="carga" />
        <p id="carga">Carga del 01/11</p>
      </>,
    )
    const selector = screen.getByLabelText('Capataz')
    expect(selector.getAttribute('aria-invalid')).toBe('true')
    expect(selector.getAttribute('aria-describedby')).toBe('carga')
    expect(screen.queryByText('Sin capataz libre el 01/11', { selector: 'span' })).toBeNull()
  })
})
