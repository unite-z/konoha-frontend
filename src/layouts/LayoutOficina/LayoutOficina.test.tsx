// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePaginaActual } from '../../hooks/usePaginaActual'
import type { SesionCore } from '../../types/core'
import LayoutOficina from './LayoutOficina'

const sesion: SesionCore = {
  usuario: { id: 1, nombre: 'Robert G.', nombre_usuario: 'rg' },
  rol: { codigo: 'jefe-seccion', nombre: 'Jefe de sección' },
  permisos: ['INV.INVENTARIO.CONSULTAR'],
  debe_cambiar_contrasena: false,
  expira: null,
}

vi.mock('../../sesion/ContextoSesion', () => ({
  useSesion: () => ({ estado: { tipo: 'activa', sesion }, cerrarSesion: async () => {} }),
  useSesionActiva: () => sesion,
}))

afterEach(cleanup)

function Coberturas() {
  usePaginaActual('Coberturas vegetales', [{ texto: 'Áreas verdes', ruta: '/areas-verdes' }, { texto: 'Coberturas vegetales' }])
  return <p>Contenido de coberturas</p>
}

function pintar() {
  render(
    <MemoryRouter initialEntries={['/areas-verdes/coberturas']}>
      <Routes>
        <Route element={<LayoutOficina />}>
          <Route path="/areas-verdes/coberturas" element={<Coberturas />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('LayoutOficina', () => {
  it('el título de la página es el único h1 y va al principio del contenido', () => {
    pintar()

    const titulo = screen.getByRole('heading', { level: 1, name: 'Coberturas vegetales' })
    const contenido = screen.getByRole('main')
    expect(contenido.firstElementChild).toBe(titulo)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('la cabecera lleva las migas y el usuario, sin título', () => {
    pintar()

    const cabecera = screen.getByRole('banner')
    const migas = within(cabecera).getByRole('navigation', { name: 'Migas de pan' })
    expect(within(migas).getByRole('link', { name: 'Áreas verdes' }).getAttribute('href')).toBe('/areas-verdes')
    expect(within(migas).getByText('Coberturas vegetales').getAttribute('aria-current')).toBe('page')
    expect(within(cabecera).queryByRole('heading')).toBeNull()
    expect(within(cabecera).getByText('Robert G.')).toBeTruthy()
    expect(within(cabecera).getByRole('button', { name: 'Cerrar sesión' })).toBeTruthy()
  })

  it('ofrece «Saltar al contenido» hacia el main', () => {
    pintar()

    expect(screen.getByRole('link', { name: 'Saltar al contenido' }).getAttribute('href')).toBe('#contenido')
    expect(screen.getByRole('main').id).toBe('contenido')
  })
})
