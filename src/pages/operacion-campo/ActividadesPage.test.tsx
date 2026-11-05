// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import ActividadesPage from './ActividadesPage'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const pagina = (results: unknown[]) => ({ count: results.length, results, next: null, previous: null })
const actividad = {
  id: 8, cuadrilla_nombre: 'Equipo norte', tipo_actividad_nombre: 'Canteo histórico',
  area_verde_nombre: 'Jardín de prueba', fecha_hora_actividad: '2026-10-22T13:00:00Z',
  fecha_hora_registro: '2026-10-22T18:00:00Z',
}

it('consulta por cuadrilla, muestra las dos horas en Lima y actualiza los registros', async () => {
  const consultas: URL[] = []
  let registrado = false
  vi.stubGlobal('fetch', vi.fn(async (ruta: string) => {
    const url = new URL(ruta, 'http://localhost')
    if (url.pathname.includes('cuadrillas')) return Response.json(pagina([{ id: 2, nombre: 'Equipo norte' }]))
    consultas.push(url)
    return Response.json(pagina(registrado ? [actividad] : []))
  }))
  render(<MemoryRouter><ActividadesPage /></MemoryRouter>)
  const usuario = userEvent.setup()
  await usuario.selectOptions(await screen.findByLabelText('Cuadrilla'), '2')
  await waitFor(() => expect(consultas.at(-1)?.searchParams.get('cuadrilla_id')).toBe('2'))
  expect(await screen.findByText('No hay actividades con estos filtros')).toBeTruthy()
  registrado = true
  await usuario.click(screen.getByRole('button', { name: 'Actualizar' }))
  expect(await screen.findByText('Canteo histórico')).toBeTruthy()
  expect(screen.getByText(/08:00/)).toBeTruthy()
  expect(screen.getByText(/13:00/)).toBeTruthy()
})

it('muestra el rechazo de permisos y permite reintentar la consulta', async () => {
  let permitido = false
  vi.stubGlobal('fetch', vi.fn(async (ruta: string) => {
    if (ruta.includes('cuadrillas')) return Response.json(pagina([]))
    return permitido
      ? Response.json(pagina([{ ...actividad, fecha_hora_registro: null }]))
      : Response.json({ detalle: 'Sin permisos para consultar actividades' }, { status: 403 })
  }))
  render(<MemoryRouter><ActividadesPage /></MemoryRouter>)
  expect(await screen.findByText('Sin permisos para consultar actividades')).toBeTruthy()
  permitido = true
  await userEvent.setup().click(screen.getByRole('button', { name: /Reintentar/ }))
  expect(await screen.findByText('Sin hora registrada')).toBeTruthy()
})
