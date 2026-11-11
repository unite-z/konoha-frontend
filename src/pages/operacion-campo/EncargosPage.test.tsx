// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import EncargosPage from './EncargosPage'

vi.mock('@/sesion/ContextoSesionCampo', () => ({
  useSesionCampo: () => ({ usuario: { rol: 'Jefe de sección' } }),
}))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function () { this.open = true }
  HTMLDialogElement.prototype.close ??= function () { this.open = false }
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('envía el encargo directo con plazo y sin reunión ni periodo', async () => {
  const guardar = vi.fn()
  vi.stubGlobal('fetch', vi.fn(async (ruta: string, opciones: RequestInit = {}) => {
    const path = new URL(ruta, 'http://localhost').pathname
    if (opciones.method === 'POST') {
      guardar(JSON.parse(String(opciones.body)))
      return Response.json({ id: 1 })
    }
    const resultados = path.endsWith('/cuadrillas/')
      ? [{ id: 7, nombre: 'Cuadrilla Norte', capataz_nombre: 'María', activa: true }]
      : path.includes('/catalogos/')
        ? [{ id: 2, nombre: 'Catálogo de prueba', activo: true }]
        : []
    return Response.json({ count: resultados.length, results: resultados, next: null, previous: null })
  }))
  render(<EncargosPage />, { wrapper: MemoryRouter })
  const usuario = userEvent.setup()
  await usuario.click(screen.getByRole('button', { name: 'Registrar encargo' }))
  const formulario = within(screen.getByRole('dialog'))
  await usuario.selectOptions(await formulario.findByLabelText('Modalidad'), 'Directo')
  expect(formulario.queryByLabelText(/Fecha de reunión|Inicio del periodo|Fin del periodo/)).toBeNull()
  await usuario.selectOptions(formulario.getByLabelText(/Cuadrilla y capataz/), '7')
  await usuario.selectOptions(formulario.getByLabelText(/Tipo de actividad/), '2')
  await usuario.selectOptions(formulario.getByLabelText(/Espacio/), '2')
  fireEvent.change(formulario.getByLabelText(/Plazo previsto/), { target: { value: '2099-06-20' } })
  await usuario.type(formulario.getByLabelText(/Descripción del encargo/), 'Podar junto al sendero')
  await usuario.click(formulario.getByRole('button', { name: 'Guardar encargo' }))
  await waitFor(() => expect(guardar).toHaveBeenCalledWith({
    cuadrilla_id: 7,
    tipo_actividad_id: 2,
    area_verde_id: 2,
    descripcion: 'Podar junto al sendero',
    periodicidad: 'Directo',
    plazo_previsto: '2099-06-20',
  }))
})
