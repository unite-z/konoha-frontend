// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PERMISOS } from '@/config/permisosCore'
import { rutaRediseno } from '../rutas'
import { CLAVE_DISENO_NUEVO } from '../useDisenoNuevo'

const sesion = vi.hoisted(() => ({ estado: { tipo: 'anonima' } as unknown }))
vi.mock('@/sesion/ContextoSesion', async (importar) => ({
  ...(await importar<typeof import('@/sesion/ContextoSesion')>()),
  useSesion: () => ({
    estado: sesion.estado,
    ingresar: vi.fn(),
    recargar: vi.fn(),
    cerrarSesion: vi.fn(),
  }),
  useSesionActiva: () => (sesion.estado as { sesion?: unknown }).sesion ?? null,
  usePermisos: () => (sesion.estado as { sesion?: { permisos: string[] } }).sesion?.permisos ?? null,
}))

const conInventario = (debeCambiar: boolean) => ({
  tipo: 'activa',
  sesion: {
    usuario: { nombre: 'Robert G.' },
    permisos: [PERMISOS.consultarInventario],
    debe_cambiar_contrasena: debeCambiar,
  },
})

beforeEach(() => {
  const datos = new Map<string, string>([[CLAVE_DISENO_NUEVO, '1']])
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: vi.fn(),
  })
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  sesion.estado = { tipo: 'anonima' }
})

function montar(ruta: string) {
  const router = createMemoryRouter(
    [
      rutaRediseno,
      { path: '/ingreso', element: <p>Ingreso actual</p> },
      { path: '/cambiar-contrasena', element: <p>Cambio actual</p> },
    ],
    { initialEntries: [ruta] },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('rutas de cuenta bajo /n (AV-439)', () => {
  it('sin sesión, /n/ingreso es público y se ve el formulario', () => {
    const router = montar('/n/ingreso')
    expect(router.state.location.pathname).toBe('/n/ingreso')
    expect(screen.getByRole('heading', { name: 'Inicia sesión' })).toBeTruthy()
  })

  it('sin sesión, el resto de /n lleva al ingreso con ?volver=', () => {
    const router = montar('/n/mapa')
    expect(router.state.location.pathname).toBe('/ingreso')
    expect(router.state.location.search).toBe('?volver=%2Fn%2Fmapa')
  })

  it('con contraseña temporal, /n/cambiar-contrasena se ve', () => {
    sesion.estado = {
      tipo: 'activa',
      sesion: { permisos: [], debe_cambiar_contrasena: true },
    }
    expect(montar('/n/cambiar-contrasena').state.location.pathname).toBe('/n/cambiar-contrasena')
    expect(screen.getByRole('heading', { name: 'Define tu contraseña' })).toBeTruthy()
  })

  it('con contraseña temporal, el resto de /n lleva a cambiarla', () => {
    sesion.estado = {
      tipo: 'activa',
      sesion: { permisos: [], debe_cambiar_contrasena: true },
    }
    expect(montar('/n/mapa').state.location.pathname).toBe('/cambiar-contrasena')
  })

  it('sin sesión, el ingreso no muestra la cabecera ni la barra inferior', () => {
    montar('/n/ingreso')
    expect(screen.queryByRole('banner')).toBeNull()
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('con contraseña temporal, el cambio no ofrece navegar a secciones que el servidor no deja usar', () => {
    sesion.estado = conInventario(true)
    montar('/n/cambiar-contrasena')
    expect(screen.queryByRole('navigation', { name: 'Secciones' })).toBeNull()
  })

  it('con sesión completa, el resto de /n sí lleva la cabecera con sus secciones', () => {
    sesion.estado = conInventario(false)
    montar('/n')
    expect(screen.getByRole('navigation', { name: 'Secciones' })).toBeTruthy()
  })
})
