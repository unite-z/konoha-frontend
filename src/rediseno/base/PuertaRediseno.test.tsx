// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PuertaRediseno, rutaRediseno } from '../rutas'
import { CLAVE_DISENO_NUEVO } from '../usarDisenoNuevo'

const datos = new Map<string, string>()

beforeEach(() => {
  datos.clear()
  vi.stubGlobal('localStorage', {
    getItem: (clave: string) => datos.get(clave) ?? null,
    setItem: (clave: string, valor: string) => void datos.set(clave, valor),
  })
  delete document.documentElement.dataset.tema
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function montar(ruta: string) {
  const router = createMemoryRouter(
    [
      rutaRediseno,
      {
        path: '/',
        element: (
          <PuertaRediseno>
            <p>Inicio actual</p>
          </PuertaRediseno>
        ),
      },
    ],
    { initialEntries: [ruta] },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('PuertaRediseno y rutas /n (AV-420)', () => {
  it('apagado, /n/mapa avisa y «Activar diseño nuevo» lo enciende', async () => {
    montar('/n/mapa')
    expect(screen.getByRole('heading', { name: 'El diseño nuevo está desactivado' })).toBeTruthy()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Activar diseño nuevo' }))
    expect(screen.getByRole('heading', { name: 'Mapa: en construcción' })).toBeTruthy()
    expect(datos.get(CLAVE_DISENO_NUEVO)).toBe('1')
    expect(document.documentElement.dataset.tema).toBe('amarillento')
  })

  it('sin elegir y apagado, «/» sigue siendo el inicio actual', () => {
    montar('/')
    expect(screen.getByText('Inicio actual')).toBeTruthy()
    cleanup()
    datos.set(CLAVE_DISENO_NUEVO, '0')
    montar('/')
    expect(screen.getByText('Inicio actual')).toBeTruthy()
  })

  it('encendido, «/» redirige a /n', () => {
    datos.set(CLAVE_DISENO_NUEVO, '1')
    const router = montar('/')
    expect(router.state.location.pathname).toBe('/n')
    expect(screen.getByRole('heading', { name: 'Diseño nuevo: en construcción' })).toBeTruthy()
  })

  it('al salir del diseño nuevo restaura el tema anterior', () => {
    datos.set(CLAVE_DISENO_NUEVO, '1')
    document.documentElement.dataset.tema = 'oscuro'
    montar('/n/reportes')
    expect(document.documentElement.dataset.tema).toBe('amarillento')
    cleanup()
    expect(document.documentElement.dataset.tema).toBe('oscuro')
  })
})
