// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import type { ActividadCampo } from '@/types/operacionCampo'
import VerificacionActividad from './VerificacionActividad'

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

it('separa la ejecución y registra la verificación con el contrato esperado', async () => {
  const cuerpos: Record<string, unknown>[] = []
  const actividad = {
    id: 7,
    tipo_actividad_nombre: 'Poda menor',
    area_verde_nombre: 'Jardín central',
    observaciones: 'El capataz retiró ramas secas',
    verificacion_observaciones: null,
    verificado_por_usuario_id: null,
    verificado_por_nombre: null,
    fecha_verificacion: null,
  } as ActividadCampo
  vi.stubGlobal(
    'fetch',
    vi.fn(async (ruta: string, opciones: RequestInit = {}) => {
      if (opciones.method === 'PUT') {
        cuerpos.push(JSON.parse(String(opciones.body)) as Record<string, unknown>)
        return Response.json({ ...actividad, ...cuerpos[0] })
      }
      if (String(ruta).includes('/historial/'))
        return Response.json([
          {
            accion: 'Alta',
            usuario: 'Capataz',
            fecha_hora: '2026-11-10T08:00:00-05:00',
            valores_anteriores: {},
            valores_nuevos: { tipo_actividad_nombre: 'Poda menor' },
            motivo: null,
          },
        ])
      return Response.json({})
    }),
  )
  const guardadas: ActividadCampo[] = []
  render(
    <VerificacionActividad actividad={actividad} onCerrar={() => {}} onGuardado={(valor) => guardadas.push(valor)} />,
  )
  expect(screen.getByRole('dialog', { name: 'Verificar actividad en campo' }).className).toMatch(/extraAmplio/)
  expect(screen.queryByText('* Campo obligatorio')).toBeNull()
  expect(await screen.findByRole('region', { name: 'Historial de cambios' })).toBeTruthy()
  expect(screen.getByText(/El capataz retiró ramas secas/)).toBeTruthy()
  const usuario = userEvent.setup()
  await usuario.type(screen.getByLabelText(/Observaciones de la verificación/), '  Conforme en campo  ')
  await usuario.click(screen.getByRole('button', { name: 'Registrar verificación' }))
  await waitFor(() => expect(guardadas).toHaveLength(1))
  expect(cuerpos).toEqual([{ observaciones: 'Conforme en campo' }])
})
