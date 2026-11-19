// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import type { ActividadCampo } from '@/types/operacionCampo'
import AnulacionActividad from './AnulacionActividad'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close ??= function () {
    this.open = false
  }
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('exige un motivo no vacío y envía la anulación con el contrato esperado', async () => {
  const actividad = {
    id: 8,
    tipo_actividad_nombre: 'Riego manual',
    area_verde_nombre: 'Jardín central',
    estado_actividad: 'Registrada',
  } as ActividadCampo
  const cuerpos: unknown[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_ruta: string, opciones: RequestInit = {}) => {
      cuerpos.push(JSON.parse(String(opciones.body)))
      return Response.json({
        ...actividad,
        estado_actividad: 'Anulada',
        anulacion_motivo: 'Registro duplicado',
      })
    }),
  )
  const guardadas: ActividadCampo[] = []
  render(<AnulacionActividad actividad={actividad} onCerrar={() => {}} onGuardado={(valor) => guardadas.push(valor)} />)
  const usuario = userEvent.setup()

  await usuario.type(screen.getByLabelText(/Motivo de anulación/), '   ')
  await usuario.click(screen.getByRole('button', { name: 'Confirmar anulación' }))
  expect(await screen.findByText('Escribe el motivo de la anulación')).toBeTruthy()
  expect(cuerpos).toHaveLength(0)

  await usuario.clear(screen.getByLabelText(/Motivo de anulación/))
  await usuario.type(screen.getByLabelText(/Motivo de anulación/), '  Registro duplicado  ')
  await usuario.click(screen.getByRole('button', { name: 'Confirmar anulación' }))

  await waitFor(() => expect(guardadas).toHaveLength(1))
  expect(cuerpos).toEqual([{ motivo: 'Registro duplicado' }])
})
