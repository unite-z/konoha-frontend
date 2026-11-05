// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import DialogoNuevaActividad from './DialogoNuevaActividad'

const pagina = (results: unknown[]) => ({ count: results.length, results, next: null, previous: null })

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function () { this.open = true }
  HTMLDialogElement.prototype.close ??= function () { this.open = false }
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('envía clase, fecha de solicitud e incidencia junto con la actividad', async () => {
  const guardado = vi.fn()
  const cuerpos: Record<string, unknown>[] = []
  vi.stubGlobal('fetch', vi.fn(async (ruta: string, opciones: RequestInit) => {
    const url = new URL(ruta, 'http://localhost')
    if (opciones.method === 'POST') {
      const cuerpo = JSON.parse(String(opciones.body)) as Record<string, unknown>
      cuerpos.push(cuerpo)
      return Response.json({ id: cuerpos.length, ...cuerpo })
    }
    if (url.pathname.includes('clases-actividad')) return Response.json(pagina([{ id: 3, nombre: 'Mantenimiento', activo: true }]))
    if (url.pathname.includes('tipos-actividad')) return Response.json(pagina([{ id: 7, nombre: 'Canteo', activo: true, clase_id: 3 }]))
    if (url.pathname.includes('areas-verdes')) return Response.json(pagina([{ id: 2, nombre: 'Jardín', activo: true }]))
    if (url.pathname.includes('unidades-medida')) return Response.json(pagina([{ id: 1, nombre: 'Unidad', simbolo: 'und' }]))
    if (url.pathname.includes('cuadrillas')) return Response.json(pagina([{ id: 1, nombre: 'Cuadrilla' }]))
    if (url.pathname.includes('partes')) return Response.json(pagina([{ id: 10, fecha: '2026-10-21', estado: 'Abierto' }]))
    return Response.json(pagina([]))
  }))
  render(<DialogoNuevaActividad onCerrar={() => {}} onGuardado={guardado} />)
  const usuario = userEvent.setup()
  await usuario.selectOptions(await screen.findByLabelText(/^Cuadrilla/), '1')
  await usuario.selectOptions(screen.getByLabelText(/^Clase de actividad/), '3')
  await usuario.selectOptions(screen.getByLabelText(/^Tipo de actividad/), '7')
  await usuario.selectOptions(screen.getByLabelText(/^Espacio/), '2')
  await usuario.clear(screen.getByLabelText(/^Fecha de atención/))
  await usuario.type(screen.getByLabelText(/^Fecha de atención/), '2026-10-21')
  await usuario.type(screen.getByLabelText(/^Fecha de solicitud/), '2026-10-20')
  await usuario.type(screen.getByLabelText(/^Identificador de incidencia/), '12')
  await usuario.type(screen.getByLabelText(/^Superficie intervenida/), '12,5')
  await usuario.type(screen.getByLabelText(/^Cantidad solicitada/), '10')
  await usuario.type(screen.getByLabelText(/^Cantidad ejecutada/), '8')
  await usuario.selectOptions(screen.getByLabelText(/^Unidad de medida/), '1')
  await usuario.type(screen.getByLabelText(/^Tiempo empleado/), '90')
  await usuario.click(screen.getByRole('button', { name: 'Registrar y seleccionar operarios' }))
  await waitFor(() => expect(guardado).toHaveBeenCalled())
  expect(cuerpos.at(-1)).toMatchObject({ clase_actividad_id: 3, tipo_actividad_id: 7, area_verde_id: 2, fecha_solicitud: '2026-10-20', incidencia_id: 12, superficie_m2: 12.5, cantidad_solicitada: 10, cantidad_ejecutada: 8, unidad_medida_id: 1, tiempo_minutos: 90 })
})
