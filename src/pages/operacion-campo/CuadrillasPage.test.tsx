// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import CuadrillasPage from './CuadrillasPage'

vi.mock('@/sesion/ContextoSesion', () => ({
  usePermisos: () => ['CAM.CUADRILLA.GESTIONAR', 'CAM.CUADRILLA.CONSULTAR'],
}))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function () { this.open = true }
  HTMLDialogElement.prototype.close ??= function () { this.open = false }
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('asigna una cuenta de Capataz sin registrar personal a mano', async () => {
  const peticiones: { ruta: string; cuerpo: unknown }[] = []
  vi.stubGlobal('fetch', vi.fn(async (ruta: string, opciones: RequestInit = {}) => {
    const url = new URL(ruta, 'http://localhost')
    if (opciones.method === 'POST') {
      peticiones.push({ ruta: url.pathname, cuerpo: JSON.parse(String(opciones.body)) })
      return Response.json({ id: 1 })
    }
    let results: unknown[] = []
    if (url.pathname.endsWith('/usuarios/')) {
      expect(url.searchParams.get('rol')).toBe('capataz')
      expect(url.searchParams.get('estado')).toBe('activa')
      results = [{ id: 7, nombre: 'Capataz de campo', correo: null, fecha_fin_vigencia: null }]
    }
    if (url.pathname.endsWith('/personal/')) {
      results = [{ id: 9, nombres: 'Capataz', apellidos: 'Sin cuenta', tipo_personal: 'Capataz', usuario_id: null, activo: true }]
    }
    return Response.json({ count: results.length, results, next: null, previous: null })
  }))
  render(<CuadrillasPage />, { wrapper: MemoryRouter })
  const usuario = userEvent.setup()
  await usuario.click(screen.getByRole('button', { name: 'Registrar cuadrilla' }))
  const selector = await screen.findByLabelText(/^Capataz responsable/)
  expect(screen.queryByRole('option', { name: 'Capataz Sin cuenta' })).toBeNull()
  await usuario.type(screen.getByLabelText(/^Nombre de la cuadrilla/), 'Cuadrilla Norte')
  await usuario.selectOptions(selector, 'usuario:7')
  await usuario.click(screen.getByRole('button', { name: 'Guardar cuadrilla' }))
  await waitFor(() => expect(peticiones).toEqual([{
    ruta: '/api/v1/operacion-campo/cuadrillas/',
    cuerpo: { nombre: 'Cuadrilla Norte', capataz_usuario_id: 7, activa: true, operarios: [] },
  }]))
})
