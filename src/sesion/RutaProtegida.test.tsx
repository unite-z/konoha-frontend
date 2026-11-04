// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import LayoutOficina from '@/layouts/LayoutOficina/LayoutOficina'
import type { SesionCore } from '@/types/core'
import { RutaConPermiso } from './RutaProtegida'

const sesion: SesionCore = {
  usuario: { id: 3, nombre: 'Luis P.', nombre_usuario: 'lp' },
  rol: { codigo: 'capataz', nombre: 'Capataz' },
  permisos: [],
  debe_cambiar_contrasena: false,
  expira: null,
}

vi.mock('@/sesion/ContextoSesion', () => ({
  useSesion: () => ({ estado: { tipo: 'activa', sesion }, cerrarSesion: async () => {} }),
  useSesionActiva: () => sesion,
}))

afterEach(cleanup)

function pintar(seccion?: string) {
  render(
    <MemoryRouter initialEntries={['/planificacion']}>
      <Routes>
        <Route element={<LayoutOficina />}>
          <Route path="/planificacion" element={<RutaConPermiso permiso="PLA.PLANIFICACION.CONSULTAR" seccion={seccion} descripcion="Tu ruta del día y el calendario están en la app móvil." />}>
            <Route index element={<p>Contenido del resumen</p>} />
          </Route>
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('RutaConPermiso', () => {
  it('con la sección, muestra «Acceso denegado» como en Figma 374-7925', () => {
    pintar('Planificación')

    expect(screen.queryByText('Contenido del resumen')).toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: 'Acceso denegado' }).className).toBe('sr-only')
    expect(screen.getByRole('heading', { level: 2, name: 'No tienes acceso a Planificación' })).toBeTruthy()
    expect(screen.getByText('Tu ruta del día y el calendario están en la app móvil.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Volver al inicio' }).getAttribute('href')).toBe('/')
    expect(document.title).toContain('Acceso denegado')
  })

  it('sin la sección, mantiene el aviso genérico', () => {
    pintar()

    expect(screen.getByRole('heading', { name: 'No tiene permiso para esta acción' })).toBeTruthy()
  })
})
