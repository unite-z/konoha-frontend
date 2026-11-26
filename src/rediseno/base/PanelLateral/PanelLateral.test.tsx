// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PanelLateral from './PanelLateral'
import { useParametroPanel } from './useParametroPanel'

vi.mock('@/components/core/HistorialCambios', () => ({ default: () => <p>Historial común</p> }))
vi.mock('@/components/core/Adjuntos', () => ({ default: () => <p>Adjuntos comunes</p> }))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function Prueba({ editando = false }: { editando?: boolean }) {
  const panel = useParametroPanel('area')
  const { search } = useLocation()
  return (
    <>
      <output aria-label="url">{search}</output>
      <button onClick={() => panel.abrir('7')}>Abrir área 7</button>
      <button onClick={() => panel.abrir('8')}>Abrir área 8</button>
      <PanelLateral
        abierto={panel.valor !== null}
        onCerrar={panel.cerrar}
        titulo={`Área ${panel.valor}`}
        subtitulo="Jardín"
        editando={editando}
        pie={<button>Guardar</button>}
        historial={{ entidad: 'ejemplar', registroId: 7 }}
        pestanas={[{ valor: 'datos', texto: 'Datos', contenido: <p>Ficha</p> }]}
      >
        <p>Cuerpo</p>
        <dialog open aria-label="Ventana interna">
          <button>Dentro de la ventana</button>
        </dialog>
      </PanelLateral>
    </>
  )
}

function montar(entrada = '/mapa', editando = false) {
  const router = createMemoryRouter([{ path: '/mapa', element: <Prueba editando={editando} /> }], {
    initialEntries: [entrada],
  })
  render(<RouterProvider router={router} />)
  return router
}

describe('PanelLateral', () => {
  it('se abre al leer el parámetro de la URL (recarga) y muestra cabecera, cuerpo y pie', () => {
    montar('/mapa?area=7')
    expect(screen.getByRole('complementary', { name: 'Área 7' })).toBeTruthy()
    expect(screen.getByText('Jardín')).toBeTruthy()
    expect(screen.getByText('Cuerpo')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeTruthy()
  })

  it('abrir escribe el parámetro y «Atrás» cierra el panel', async () => {
    const router = montar()
    const usuario = userEvent.setup()
    expect(screen.queryByRole('complementary')).toBeNull()
    await usuario.click(screen.getByRole('button', { name: 'Abrir área 7' }))
    expect(screen.getByLabelText('url').textContent).toBe('?area=7')
    expect(screen.getByRole('complementary')).toBeTruthy()
    await act(() => router.navigate(-1))
    expect(screen.queryByRole('complementary')).toBeNull()
  })

  it('el botón cerrar deshace la entrada de historial y devuelve el foco al origen', async () => {
    montar()
    const usuario = userEvent.setup()
    const origen = screen.getByRole('button', { name: 'Abrir área 7' })
    await usuario.click(origen)
    await usuario.click(screen.getByRole('button', { name: 'Cerrar panel' }))
    expect(screen.queryByRole('complementary')).toBeNull()
    expect(document.activeElement).toBe(origen)
  })

  it('abrir otra fila con el panel abierto no apila entradas: cerrar vuelve a la vista sin panel', async () => {
    const router = montar()
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Abrir área 7' }))
    await usuario.click(screen.getByRole('button', { name: 'Abrir área 8' }))
    expect(screen.getByRole('complementary', { name: 'Área 8' })).toBeTruthy()
    await usuario.click(screen.getByRole('button', { name: 'Cerrar panel' }))
    expect(screen.queryByRole('complementary')).toBeNull()
    expect(router.state.location.search).toBe('')
  })

  it('Esc dentro de un <dialog> abierto en el panel no cierra el panel', async () => {
    montar('/mapa?area=7')
    const usuario = userEvent.setup()
    screen.getByRole('button', { name: 'Dentro de la ventana' }).focus()
    await usuario.keyboard('{Escape}')
    expect(screen.getByRole('complementary')).toBeTruthy()
  })

  it('con enlace directo, cerrar quita el parámetro sin salir de la página', async () => {
    const router = montar('/mapa?area=7')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cerrar panel' }))
    expect(router.state.location.search).toBe('')
    expect(screen.queryByRole('complementary')).toBeNull()
  })

  it('Esc cierra el panel, salvo en modo edición', async () => {
    const usuario = userEvent.setup()
    montar('/mapa?area=7', true)
    expect(screen.getByText('Editando')).toBeTruthy()
    await usuario.keyboard('{Escape}')
    expect(screen.getByRole('complementary')).toBeTruthy()
    cleanup()
    montar('/mapa?area=7')
    await usuario.keyboard('{Escape}')
    expect(screen.queryByRole('complementary')).toBeNull()
  })

  it('añade «Historial» y «Adjuntos» como pestañas y cambia con flechas', async () => {
    montar('/mapa?area=7')
    const usuario = userEvent.setup()
    expect(screen.getByText('Ficha')).toBeTruthy()
    await usuario.click(screen.getByRole('tab', { name: 'Historial' }))
    expect(screen.getByText('Historial común')).toBeTruthy()
    expect(screen.queryByText('Ficha')).toBeNull()
    await usuario.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Datos' }).getAttribute('aria-selected')).toBe('true')
  })

  it('en móvil es una hoja modal a pantalla completa con el foco atrapado', async () => {
    vi.stubGlobal('matchMedia', (consulta: string) => ({
      matches: consulta.includes('max-width'),
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    montar('/mapa?area=7')
    const hoja = screen.getByRole('dialog', { name: 'Área 7' })
    expect(hoja.getAttribute('aria-modal')).toBe('true')
    expect(hoja.getAttribute('data-presentacion')).toBe('hoja')
    // Foco atrapado: Tab desde el último control vuelve al primero y Mayús+Tab desde el primero va al último.
    const cerrar = screen.getByRole('button', { name: 'Cerrar panel' })
    const guardar = screen.getByRole('button', { name: 'Guardar' })
    guardar.focus()
    await userEvent.setup().tab()
    expect(document.activeElement).toBe(cerrar)
    await userEvent.setup().tab({ shift: true })
    expect(document.activeElement).toBe(guardar)
  })

  it('aplica el nombre de la transición de vista', () => {
    function Con() {
      const [n] = useState('area-7')
      return <PanelLateral abierto onCerrar={() => {}} titulo="X" viewTransitionName={n} />
    }
    render(<Con />)
    expect(screen.getByRole('complementary').style.getPropertyValue('view-transition-name')).toBe('area-7')
  })
})
