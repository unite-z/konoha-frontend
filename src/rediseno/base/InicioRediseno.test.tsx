// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PERMISOS } from '@/config/permisosCore'
import type { SesionCore } from '@/types/core'
import InicioRediseno from './InicioRediseno'

const cerrarSesion = vi.fn(async () => {})
let sesion: SesionCore | null = null

vi.mock('@/sesion/ContextoSesion', () => ({
  useSesion: () => ({ estado: { tipo: 'activa', sesion }, cerrarSesion }),
  useSesionActiva: () => sesion,
}))

afterEach(() => {
  cleanup()
  cerrarSesion.mockClear()
})

function entrar(permisos: string[]) {
  sesion = {
    usuario: { id: 1, nombre: 'Luis P.', nombre_usuario: 'lp' },
    rol: { codigo: 'capataz', nombre: 'Capataz' },
    permisos,
    debe_cambiar_contrasena: false,
    expira: null,
  }
  const router = createMemoryRouter(
    [
      { path: '/n', Component: InicioRediseno },
      { path: '/n/:seccion', element: <p>Destino</p> },
    ],
    { initialEntries: ['/n'] },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('InicioRediseno · inicio por rol (AV-425)', () => {
  it('el capataz va a su campo, aunque también tenga inventario', () => {
    const router = entrar(['CAM.PARTE.REGISTRAR', PERMISOS.consultarCuadrillas, PERMISOS.consultarInventario])
    expect(router.state.location.pathname).toBe('/n/campo')
  })

  it('quien también verifica partes no es de campo y va al Mapa si tiene inventario', () => {
    const router = entrar([
      'CAM.PARTE.REGISTRAR',
      'CAM.PARTE.VERIFICAR',
      PERMISOS.consultarCuadrillas,
      PERMISOS.consultarInventario,
    ])
    expect(router.state.location.pathname).toBe('/n/mapa')
  })

  it('con inventario, al Mapa', () => {
    const router = entrar([PERMISOS.consultarInventario, PERMISOS.consultarIndicadores])
    expect(router.state.location.pathname).toBe('/n/mapa')
  })

  it('sin inventario, a la primera sección permitida de la cabecera', () => {
    const router = entrar([PERMISOS.consultarIndicadores, PERMISOS.consultarPlanificacion])
    expect(router.state.location.pathname).toBe('/n/planificacion')
  })

  it('sin secciones, avisa y «Cerrar sesión» cierra la sesión', async () => {
    const router = entrar([])
    expect(router.state.location.pathname).toBe('/n')
    expect(screen.getByRole('heading', { name: 'Tu rol aún no tiene secciones disponibles' })).toBeTruthy()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(cerrarSesion).toHaveBeenCalledTimes(1)
  })
})
