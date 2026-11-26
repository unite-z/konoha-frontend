// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { conPuertaRediseno, rutaRediseno } from '../rutas'
import { CLAVE_DISENO_NUEVO } from '../useDisenoNuevo'

const datos = new Map<string, string>()

// Aquí no hay proveedor de sesión. Las rutas de /n (salvo el ingreso) pasan por RutaProtegida y el layout solo
// lleva la cabecera con sesión (AV-439): una sesión activa sin permisos deja pasar.
const sesionActiva = vi.hoisted(() => ({
  usuario: { id: 1, nombre: 'Usuario', nombre_usuario: 'usuario' },
  permisos: [],
  debe_cambiar_contrasena: false,
}))
vi.mock('@/sesion/ContextoSesion', async (original) => ({
  ...(await original<typeof import('@/sesion/ContextoSesion')>()),
  useSesion: () => ({
    estado: { tipo: 'activa', sesion: sesionActiva },
    recargar: () => Promise.resolve(),
  }),
  usePermisos: () => [],
  useSesionActiva: () => sesionActiva,
}))

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
        // Como en `src/router/rutas.tsx`: la puerta envuelve el layout actual.
        element: conPuertaRediseno(<Outlet />),
        children: [
          { path: '/', element: <p>Inicio actual</p> },
          {
            path: '/configuracion/apariencia',
            element: <p>Apariencia actual</p>,
          },
        ],
      },
    ],
    { initialEntries: [ruta] },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('PuertaRediseno y rutas /n (AV-420)', () => {
  it('apagado, /n/incidencias avisa y «Activar diseño nuevo» lo enciende', async () => {
    montar('/n/incidencias')
    expect(screen.getByRole('heading', { name: 'El diseño nuevo está desactivado' })).toBeTruthy()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Activar diseño nuevo' }))
    expect(screen.getByRole('heading', { name: 'Incidencias: en construcción' })).toBeTruthy()
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

  it('encendido, «/» redirige a /n conservando la consulta (AV-425)', () => {
    datos.set(CLAVE_DISENO_NUEVO, '1')
    const router = montar('/?area=7')
    expect(router.state.location.pathname).toBe('/n')
    expect(router.state.location.search).toBe('?area=7')
  })

  it('encendido, la ruta antigua lleva a su vista nueva con la consulta', () => {
    datos.set(CLAVE_DISENO_NUEVO, '1')
    const router = montar('/configuracion/apariencia?x=1')
    expect(router.state.location.pathname).toBe('/n/cuenta')
    expect(router.state.location.search).toBe('?x=1')
  })

  it('una ruta desconocida bajo /n muestra «Página no encontrada» dentro del marco nuevo', () => {
    datos.set(CLAVE_DISENO_NUEVO, '1')
    const router = montar('/n/no-existe')
    expect(router.state.location.pathname).toBe('/n/no-existe')
    expect(screen.getByRole('heading', { name: 'Página no encontrada' })).toBeTruthy()
    expect(document.documentElement.dataset.tema).toBe('amarillento')
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
