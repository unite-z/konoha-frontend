// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, Outlet, RouterProvider, useLocation } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { EnlaceTransicion } from './EnlaceTransicion'
import { useFocoConLaVista } from './useFocoConLaVista'
import { useNavegarConTransicion } from './useNavegarConTransicion'

function BotonIrAPanel() {
  const navegar = useNavegarConTransicion()
  return (
    <button type="button" onClick={() => navegar('/n/panel')}>
      Abrir panel
    </button>
  )
}

/** Layout que persiste entre rutas: su encabezado recibe el foco al cambiar de vista. */
function Escenario() {
  const encabezado = useFocoConLaVista<HTMLHeadingElement>()
  const { pathname } = useLocation()
  return (
    <main>
      <h1 ref={encabezado} tabIndex={-1}>
        Vista {pathname}
      </h1>
      <EnlaceTransicion to="/n/mapa">Mapa</EnlaceTransicion>
      <BotonIrAPanel />
      <Outlet />
    </main>
  )
}

function montar() {
  const router = createMemoryRouter([
    {
      path: '/',
      element: <Escenario />,
      children: [
        { index: true, element: <p>Inicio</p> },
        { path: 'n/mapa', element: <p>Mapa del campus</p> },
        { path: 'n/panel', element: <p>Panel</p> },
      ],
    },
  ])
  render(<RouterProvider router={router} />)
  return router
}

// jsdom no tiene document.startViewTransition: se prueba la alternativa sin soporte.
describe('navegación con transición sin View Transitions', () => {
  afterEach(cleanup)

  it('EnlaceTransicion navega con un cambio directo y sin errores', async () => {
    const router = montar()
    const enlace = screen.getByRole('link', { name: 'Mapa' })
    expect(enlace.getAttribute('href')).toBe('/n/mapa')
    fireEvent.click(enlace)
    expect(await screen.findByText('Mapa del campus')).toBeTruthy()
    expect(router.state.location.pathname).toBe('/n/mapa')
  })

  it('useNavegarConTransicion navega a la ruta pedida', async () => {
    const router = montar()
    fireEvent.click(screen.getByRole('button', { name: 'Abrir panel' }))
    expect(await screen.findByText('Panel')).toBeTruthy()
    expect(router.state.location.pathname).toBe('/n/panel')
  })

  it('el foco se mueve al encabezado de la vista nueva, no en la primera carga', async () => {
    montar()
    expect(document.activeElement).toBe(document.body)
    fireEvent.click(screen.getByRole('link', { name: 'Mapa' }))
    const encabezado = await screen.findByRole('heading', {
      name: 'Vista /n/mapa',
    })
    expect(document.activeElement).toBe(encabezado)
  })
})
