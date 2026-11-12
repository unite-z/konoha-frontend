// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import type { ActividadCampo } from '@/types/operacionCampo'
import MaterialesActividad from './MaterialesActividad'
vi.mock('@/sesion/ContextoSesion', () => ({ useSesionActiva: () => ({ usuario: { id: 4, nombre: 'J. Ramos' } }) }))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function () { this.open = true }
  HTMLDialogElement.prototype.close ??= function () { this.open = false }
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('valida un traslado y lo guarda sin duplicar la actividad', async () => {
  const escritos: Record<string, unknown>[] = []
  const pagina = (results: unknown[]) => ({ count: results.length, results, next: null, previous: null })
  vi.stubGlobal('fetch', vi.fn(async (ruta: string, opciones: RequestInit) => {
    const url = new URL(ruta, 'http://localhost')
    if (opciones.method === 'POST') {
      escritos.push(JSON.parse(String(opciones.body)) as Record<string, unknown>)
      return Response.json({ id: 1 })
    }
    if (url.pathname.includes('unidades-medida')) return Response.json(pagina([{ id: 1, nombre: 'Unidad', simbolo: 'und' }]))
    if (url.pathname.includes('catalogos/materiales')) return Response.json(pagina([{ id: 1, nombre: 'Esquejes', activo: true }]))
    return Response.json([])
  }))
  const actividad = { id: 1, tipo_actividad_nombre: 'Propagación', area_verde_nombre: 'Jardín', estado: 'Abierto' } as ActividadCampo
  render(<MaterialesActividad actividad={actividad} soloLectura={false} onCerrar={() => {}} />)
  expect(await screen.findByText('No hay materiales registrados')).toBeTruthy()
  const usuario = userEvent.setup()
  await usuario.selectOptions(await screen.findByLabelText('Material o insumo'), '1')
  await usuario.type(screen.getByLabelText('Cantidad utilizada'), '4,5')
  await usuario.selectOptions(screen.getByLabelText('Unidad de medida'), '1')
  await usuario.type(screen.getByLabelText('Origen del traslado'), 'Vivero')
  await usuario.click(screen.getByRole('button', { name: 'Añadir material' }))
  expect(screen.getByText(/completa origen y destino/)).toBeTruthy()
  expect(escritos).toHaveLength(0)
  await usuario.type(screen.getByLabelText('Destino del traslado'), 'Jardín')
  await usuario.click(screen.getByRole('button', { name: 'Añadir material' }))
  await waitFor(() => expect(escritos).toHaveLength(1))
  expect(escritos[0]).toMatchObject({ material_id: 1, cantidad: 4.5, unidad_medida_id: 1, origen: 'Vivero', destino: 'Jardín' })
})
