// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import HistorialCambios from './HistorialCambios'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('presenta el alta de una actividad con etiquetas funcionales y sin identificadores internos', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Response.json([
        {
          accion: 'Alta',
          usuario: 'Jefe de sección',
          fecha_hora: '2026-11-10T09:00:00-05:00',
          valores_anteriores: {},
          valores_nuevos: {
            id: 1,
            parte_id: 1,
            tipo_actividad_id: 18,
            tipo_actividad_nombre: 'Limpieza de plantas',
            area_verde_nombre: 'Jardín central',
            fecha_hora_actividad: '2026-11-10T08:00:00-05:00',
            tiempo_minutos: 45,
            superficie_m2: 12.5,
            cantidad_ejecutada: 2,
            observaciones: 'Trabajo conforme',
            pendiente_vinculacion: false,
          },
          motivo: null,
        },
      ]),
    ),
  )

  render(<HistorialCambios entidad="actividad" registroId={1} presentacion="actividad" />)

  const tabla = await screen.findByRole('table', { name: 'Historial de cambios' })
  expect(within(tabla).getByText('Actividad')).toBeTruthy()
  expect(within(tabla).getByText('Limpieza de plantas')).toBeTruthy()
  expect(within(tabla).getByText('45 min')).toBeTruthy()
  expect(within(tabla).getByText(/12[.,]5 m²/)).toBeTruthy()
  expect(within(tabla).queryByText(/Estado de verificación|Fecha de verificación|Pendiente de verificar/)).toBeNull()
  expect(within(tabla).queryByText(/parte_id|tipo_actividad_id|pendiente_vinculacion/)).toBeNull()
})

it('muestra únicamente cambios funcionales con sus valores anterior y nuevo', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Response.json([
        {
          accion: 'Modificacion',
          usuario: 'Jefe de sección',
          fecha_hora: '2026-11-10T10:00:00-05:00',
          valores_anteriores: {
            id: 1,
            tiempo_minutos: 45,
            observaciones: 'Por revisar',
            fecha_verificacion: null,
            verificacion_observaciones: null,
          },
          valores_nuevos: {
            id: 1,
            tiempo_minutos: 60,
            observaciones: 'Por revisar',
            fecha_verificacion: '2026-11-10T10:00:00-05:00',
            verificacion_observaciones: 'Conforme en campo',
          },
          motivo: null,
        },
      ]),
    ),
  )

  render(<HistorialCambios entidad="actividad" registroId={1} presentacion="actividad" />)

  const tabla = await screen.findByRole('table', { name: 'Historial de cambios' })
  expect(within(tabla).queryByText(/Estado de verificación|Fecha de verificación/)).toBeNull()
  expect(within(tabla).getByText('Observaciones de verificación')).toBeTruthy()
  expect(within(tabla).getByText('45 min → 60 min')).toBeTruthy()
  expect(within(tabla).getByText('Sin registrar → Conforme en campo')).toBeTruthy()
  expect(within(tabla).queryByText('Por revisar')).toBeNull()
  expect(within(tabla).queryByText(/id:/)).toBeNull()
  expect(screen.getByRole('region', { name: 'Historial de cambios' })).toBeTruthy()
})

it('presenta la anulación con responsable, motivo y transición sin campos redundantes de verificación', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Response.json([
        {
          accion: 'Anulacion',
          usuario: 'Mateo Recoba',
          fecha_hora: '2026-11-10T11:00:00-05:00',
          valores_anteriores: { estado_actividad: 'Registrada', fecha_verificacion: null },
          valores_nuevos: { estado_actividad: 'Anulada', fecha_verificacion: null },
          motivo: 'Registro duplicado',
        },
      ]),
    ),
  )

  render(<HistorialCambios entidad="actividad" registroId={1} presentacion="actividad" />)

  const tabla = await screen.findByRole('table', { name: 'Historial de cambios' })
  expect(within(tabla).getByText('Anulación')).toBeTruthy()
  expect(within(tabla).getByText('Estado de la actividad')).toBeTruthy()
  expect(within(tabla).getByText('Registrada → Anulada')).toBeTruthy()
  expect(within(tabla).getByText('Motivo de anulación')).toBeTruthy()
  expect(within(tabla).getByText('Registro duplicado')).toBeTruthy()
  expect(within(tabla).queryByText(/Estado de verificación|Fecha de verificación/)).toBeNull()
})
