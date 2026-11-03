// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import GrupoOpciones, { type OpcionGrupo } from './GrupoOpciones'

afterEach(cleanup)

type Origen = 'demanda' | 'unidad' | 'programada'

const OPCIONES: OpcionGrupo<Origen>[] = [
  { valor: 'demanda', texto: 'A demanda' },
  { valor: 'unidad', texto: 'Solicitud de una unidad' },
  { valor: 'programada', texto: 'Programada', deshabilitada: true },
]

function Controlado({ inicial = null }: { inicial?: Origen | null }) {
  const [valor, setValor] = useState<Origen | null>(inicial)
  return <GrupoOpciones etiqueta="Origen de la atención" opciones={OPCIONES} valor={valor} onCambiar={setValor} obligatorio />
}

describe('GrupoOpciones', () => {
  it('es un grupo con nombre y radios con su etiqueta', () => {
    render(<Controlado />)

    const grupo = screen.getByRole('group', { name: /Origen de la atención/ })
    expect(within(grupo).getAllByRole('radio')).toHaveLength(3)
    expect(grupo.getAttribute('aria-required')).toBe('true')
  })

  it('elige con el ratón y con las flechas; la deshabilitada no se puede elegir', async () => {
    const usuario = userEvent.setup()
    render(<Controlado inicial="demanda" />)

    await usuario.click(screen.getByText('Solicitud de una unidad'))
    expect((screen.getByRole('radio', { name: 'Solicitud de una unidad' }) as HTMLInputElement).checked).toBe(true)

    await usuario.keyboard('{ArrowUp}')
    expect((screen.getByRole('radio', { name: 'A demanda' }) as HTMLInputElement).checked).toBe(true)

    expect((screen.getByRole('radio', { name: 'Programada' }) as HTMLInputElement).disabled).toBe(true)
  })

  it('variante tarjeta: la descripción describe su opción', () => {
    render(
      <GrupoOpciones
        etiqueta="Formato"
        opciones={[
          { valor: 'pdf', texto: 'PDF', descripcion: 'Para imprimir o enviar.' },
          { valor: 'xlsx', texto: 'Excel', descripcion: 'Para seguir trabajando los datos.' },
        ]}
        valor="pdf"
        onCambiar={vi.fn()}
      />,
    )

    const pdf = screen.getByRole('radio', { name: 'PDF' })
    expect(document.getElementById(pdf.getAttribute('aria-describedby') ?? '')?.textContent).toBe('Para imprimir o enviar.')
  })

  it('el error marca el grupo y queda enlazado', () => {
    render(<GrupoOpciones etiqueta="Rol" opciones={OPCIONES} valor={null} onCambiar={vi.fn()} error="Elige un rol." />)

    const grupo = screen.getByRole('group', { name: 'Rol' })
    expect(grupo.getAttribute('aria-invalid')).toBe('true')
    expect(document.getElementById(grupo.getAttribute('aria-describedby') ?? '')?.textContent).toBe('Elige un rol.')
  })

  it('con idBase, los radios y el error tienen ids estables para el resumen de errores', () => {
    render(
      <GrupoOpciones etiqueta="Origen" opciones={OPCIONES} valor={null} onCambiar={vi.fn()} idBase="nueva-origen" error="Elige el origen." />,
    )

    expect(document.getElementById('nueva-origen-demanda')?.getAttribute('type')).toBe('radio')
    expect(document.getElementById('nueva-origen-error')?.textContent).toBe('Elige el origen.')
  })

  it('deshabilitado, ningún radio se puede elegir', () => {
    render(<GrupoOpciones etiqueta="Origen" opciones={OPCIONES} valor={null} onCambiar={vi.fn()} deshabilitado />)

    for (const radio of screen.getAllByRole('radio')) expect((radio as HTMLInputElement).matches(':disabled')).toBe(true)
  })
})
