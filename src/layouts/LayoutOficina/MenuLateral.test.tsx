// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PERMISOS } from '../../config/permisosCore'
import { RUTAS_INVENTARIO, RUTAS_PLANIFICACION } from '../../router/rutasApp'
import type { SesionCore } from '../../types/core'
import MenuLateral from './MenuLateral'

const sesion = vi.hoisted(() => ({ actual: null as SesionCore | null }))
vi.mock('../../sesion/ContextoSesion', () => ({ useSesionActiva: () => sesion.actual }))

afterEach(cleanup)

function conPermisos(permisos: string[]): SesionCore {
  return {
    usuario: { id: 1, nombre: 'Robert G.', nombre_usuario: 'rg' },
    rol: { codigo: 'jefe-seccion', nombre: 'Jefe de sección' },
    permisos,
    debe_cambiar_contrasena: false,
    expira: null,
  }
}

function pintar(ruta: string, permisos: string[] = Object.values(PERMISOS)) {
  sesion.actual = conPermisos(permisos)
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <MenuLateral />
    </MemoryRouter>,
  )
  return screen.getByRole('navigation', { name: 'Menú principal' })
}

describe('MenuLateral', () => {
  it('en una subruta solo hay un elemento marcado como página actual', () => {
    const menu = pintar(RUTAS_INVENTARIO.coberturas)

    const actuales = within(menu).getAllByRole('link', { current: 'page' })
    expect(actuales).toHaveLength(1)
    expect(actuales[0].textContent).toBe('Coberturas vegetales')
  })

  it('en otra sección, el módulo anterior deja de estar marcado', () => {
    const menu = pintar(RUTAS_PLANIFICACION.restricciones)

    expect(within(menu).getAllByRole('link', { current: 'page' }).map((a) => a.textContent)).toEqual([
      'Calendario de restricciones',
    ])
  })

  it('las entradas no disponibles no son enlaces y se anuncian deshabilitadas', () => {
    const menu = pintar(RUTAS_PLANIFICACION.servicios)

    expect(within(menu).queryByRole('link', { name: /Programación/ })).toBeNull()
    expect(within(menu).getByText('Programación').closest('[aria-disabled="true"]')).not.toBeNull()
  })

  it('sin el permiso de un módulo, el módulo no aparece', () => {
    const menu = pintar(RUTAS_PLANIFICACION.servicios, [PERMISOS.consultarPlanificacion])

    expect(within(menu).getByRole('link', { name: 'Planificación' })).toBeTruthy()
    expect(within(menu).queryByRole('link', { name: 'Áreas verdes y mapa' })).toBeNull()
    expect(within(menu).queryByRole('link', { name: 'Usuarios y roles' })).toBeNull()
  })

  it('solo el grupo del módulo activo empieza desplegado; el chevron lo pliega y despliega', async () => {
    const usuario = userEvent.setup()
    const menu = pintar(RUTAS_INVENTARIO.coberturas)

    const inventario = within(menu).getByRole('button', { name: 'Plegar Áreas verdes y mapa' })
    expect(inventario.getAttribute('aria-expanded')).toBe('true')
    const planificacion = within(menu).getByRole('button', { name: 'Desplegar Planificación' })
    expect(planificacion.getAttribute('aria-expanded')).toBe('false')
    expect(within(menu).queryByRole('link', { name: 'Servicios periódicos' })).toBeNull()

    await usuario.click(planificacion)
    expect(planificacion.getAttribute('aria-expanded')).toBe('true')
    expect(within(menu).getByRole('link', { name: 'Servicios periódicos' })).toBeTruthy()

    await usuario.click(inventario)
    expect(within(menu).queryByRole('link', { name: 'Coberturas vegetales' })).toBeNull()
    expect(within(menu).getByRole('link', { name: 'Áreas verdes y mapa' }).hasAttribute('data-modulo-activo')).toBe(true)
  })
})

describe('MenuLateral comprimido', () => {
  function pintarComprimido(ruta: string, alternar = vi.fn()) {
    sesion.actual = conPermisos(Object.values(PERMISOS))
    render(
      <MemoryRouter initialEntries={[ruta]}>
        <MenuLateral comprimido onAlternarComprimido={alternar} />
      </MemoryRouter>,
    )
    return { menu: screen.getByRole('navigation', { name: 'Menú principal' }), alternar }
  }

  it('sigue habiendo un único elemento actual y el módulo queda marcado para la vista comprimida', () => {
    const { menu } = pintarComprimido(RUTAS_INVENTARIO.coberturas)

    expect(within(menu).getAllByRole('link', { current: 'page' }).map((a) => a.textContent)).toEqual([
      'Coberturas vegetales',
    ])
    const modulo = within(menu).getByRole('link', { name: 'Áreas verdes y mapa' })
    expect(modulo.hasAttribute('data-modulo-activo')).toBe(true)
    expect(modulo.querySelector('svg')).not.toBeNull()
  })

  it('arriba está el logo de la marca', () => {
    pintarComprimido(RUTAS_PLANIFICACION.servicios)

    const marca = screen.getByText('Áreas Verdes').closest('div')
    expect(marca?.querySelector('[aria-hidden="true"] svg')).not.toBeNull()
  })

  it('el botón de la marca es un interruptor para fijar el menú abierto', async () => {
    const usuario = userEvent.setup()
    const { alternar } = pintarComprimido(RUTAS_PLANIFICACION.servicios)

    const boton = screen.getByRole('button', { name: 'Fijar menú abierto' })
    expect(boton.getAttribute('aria-pressed')).toBe('false')
    await usuario.click(boton)
    expect(alternar).toHaveBeenCalledTimes(1)
  })
})
