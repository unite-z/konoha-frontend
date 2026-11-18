// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

function actividad(parcial: Partial<ActividadCampo> = {}): ActividadCampo {
  return {
    id: 7,
    tipo_actividad_nombre: 'Poda menor',
    area_verde_nombre: 'Jardín central',
    observaciones: 'El capataz retiró ramas secas',
    verificacion_observaciones: null,
    verificado_por_usuario_id: null,
    verificado_por_nombre: null,
    fecha_verificacion: null,
    estado_actividad: 'Registrada',
    encargo_seguimiento_id: null,
    ...parcial,
  } as ActividadCampo
}

function simularApi(cuerpos: Record<string, unknown>[], respuesta: ActividadCampo) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_ruta: string, opciones: RequestInit = {}) => {
      if (opciones.method === 'PUT') {
        cuerpos.push(JSON.parse(String(opciones.body)) as Record<string, unknown>)
        return Response.json(respuesta)
      }
      return Response.json([])
    }),
  )
}

it('aceptar sin observaciones oculta el campo y no envía texto residual', async () => {
  const cuerpos: Record<string, unknown>[] = []
  const base = actividad()
  simularApi(cuerpos, { ...base, estado_actividad: 'Verificada' })
  const guardado = vi.fn()
  const anular = vi.fn()
  render(
    <VerificacionActividad
      actividad={base}
      puedeAnular
      onAnular={anular}
      onCerrar={vi.fn()}
      onGuardado={guardado}
    />,
  )

  expect((screen.getByLabelText('Resultado de la verificación') as HTMLSelectElement).value).toBe(
    'sin-observaciones',
  )
  expect(screen.queryByLabelText('Observaciones de la verificación')).toBeNull()
  await userEvent.setup().click(screen.getByRole('button', { name: 'Anular actividad' }))
  expect(anular).toHaveBeenCalledOnce()
  await userEvent.setup().click(screen.getByRole('button', { name: 'Registrar verificación' }))
  await waitFor(() => expect(guardado).toHaveBeenCalledOnce())
  expect(cuerpos).toEqual([{ con_observaciones: false, observaciones: null }])
})

it('aceptar con observaciones exige las notas y crea el seguimiento vinculado', async () => {
  const cuerpos: Record<string, unknown>[] = []
  const base = actividad()
  simularApi(cuerpos, { ...base, estado_actividad: 'Observada', encargo_seguimiento_id: 12 })
  render(<VerificacionActividad actividad={base} onCerrar={vi.fn()} onGuardado={vi.fn()} />)
  const usuario = userEvent.setup()
  await usuario.selectOptions(screen.getByLabelText('Resultado de la verificación'), 'con-observaciones')
  const campoObservaciones = screen.getByLabelText(/^Observaciones de la verificación/)
  expect(campoObservaciones).toBeTruthy()

  await usuario.click(screen.getByRole('button', { name: 'Registrar verificación' }))
  expect(await screen.findByText('Escribe las observaciones de la verificación')).toBeTruthy()
  expect(cuerpos).toEqual([])

  await usuario.type(campoObservaciones, '  Falta terminar el borde ')
  await usuario.click(screen.getByRole('button', { name: 'Registrar verificación' }))
  expect(await screen.findByText('Describe qué hay que hacer en el seguimiento')).toBeTruthy()
  await usuario.type(screen.getByLabelText(/^Qué hay que hacer en el seguimiento/), '  Terminar el borde norte ')
  fireEvent.change(screen.getByLabelText(/^Plazo del seguimiento/), { target: { value: '2099-06-20' } })
  await usuario.click(screen.getByRole('button', { name: 'Registrar verificación' }))
  await waitFor(() => expect(cuerpos).toHaveLength(1))
  expect(cuerpos).toEqual([
    {
      con_observaciones: true,
      observaciones: 'Falta terminar el borde',
      encargo_seguimiento: { descripcion: 'Terminar el borde norte', plazo_previsto: '2099-06-20' },
    },
  ])
})

it('actualiza una actividad observada reutilizando su seguimiento', async () => {
  const cuerpos: Record<string, unknown>[] = []
  const observada = actividad({
    estado_actividad: 'Observada',
    verificacion_observaciones: 'Falta el borde',
    fecha_verificacion: '2026-11-10T12:00:00-05:00',
    encargo_seguimiento_id: 12,
  })
  simularApi(cuerpos, observada)
  render(<VerificacionActividad actividad={observada} onCerrar={vi.fn()} onGuardado={vi.fn()} />)

  const campoObservaciones = screen.getByLabelText(/^Observaciones de la verificación/) as HTMLTextAreaElement
  expect(campoObservaciones.value).toBe('Falta el borde')
  expect(screen.getByText(/Se reutilizará el encargo de seguimiento n.º 12/)).toBeTruthy()
  expect(screen.queryByLabelText('Qué hay que hacer en el seguimiento')).toBeNull()
  await userEvent.setup().type(campoObservaciones, ' y el sendero')
  await userEvent.setup().click(screen.getByRole('button', { name: 'Actualizar verificación' }))
  await waitFor(() => expect(cuerpos).toHaveLength(1))
  expect(cuerpos).toEqual([{ con_observaciones: true, observaciones: 'Falta el borde y el sendero' }])
})

it('cambia de observada a verificada sin borrar ni cancelar silenciosamente el seguimiento', async () => {
  const cuerpos: Record<string, unknown>[] = []
  const observada = actividad({
    estado_actividad: 'Observada',
    verificacion_observaciones: 'Falta el borde',
    fecha_verificacion: '2026-11-10T12:00:00-05:00',
    encargo_seguimiento_id: 12,
  })
  simularApi(cuerpos, { ...observada, estado_actividad: 'Verificada', verificacion_observaciones: null })
  render(<VerificacionActividad actividad={observada} onCerrar={vi.fn()} onGuardado={vi.fn()} />)

  await userEvent.setup().selectOptions(screen.getByLabelText('Resultado de la verificación'), 'sin-observaciones')
  expect(screen.queryByLabelText('Observaciones de la verificación')).toBeNull()
  expect(screen.getByText(/se conservará con su historial/)).toBeTruthy()
  await userEvent.setup().click(screen.getByRole('button', { name: 'Actualizar verificación' }))
  await waitFor(() => expect(cuerpos).toHaveLength(1))
  expect(cuerpos).toEqual([{ con_observaciones: false, observaciones: null }])
})
