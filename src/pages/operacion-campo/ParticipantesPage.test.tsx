// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import ParticipantesPage from './ParticipantesPage'

// Permisos de MOD-04 de cada rol (V9): la pantalla decide por ellos (AV-382).
const CAPATAZ = ['CAM.CUADRILLA.CONSULTAR', 'CAM.PARTE.REGISTRAR']
const JEFE = ['CAM.CUADRILLA.GESTIONAR', 'CAM.CUADRILLA.CONSULTAR', 'CAM.PARTE.CONSULTAR', 'CAM.PARTE.VERIFICAR']
const sesionPrueba = vi.hoisted(() => ({ rol: 'Capataz', permisos: [] as string[] }))

vi.mock('@/sesion/ContextoSesion', () => ({ usePermisos: () => sesionPrueba.permisos, useSesionActiva: () => ({ usuario: { id: 4, nombre: 'Prueba' } }) }))
vi.mock('@/sesion/ContextoSesionCampo', () => ({
  useSesionCampo: () => ({ usuario: { id: 4, rol: sesionPrueba.rol, personal_id: 12 } }),
}))

vi.mock('@/components/core/ExportarExcel', () => ({ default: () => null }))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function () { this.open = true }
  HTMLDialogElement.prototype.close ??= function () { this.open = false }
})

beforeEach(() => {
  sesionPrueba.rol = 'Capataz'
  sesionPrueba.permisos = CAPATAZ
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const operario = { id: 21, nombres: 'Ana', apellidos: 'Quispe', activo: true }
const actividad = {
  id: 8,
  parte_id: 3,
  cuadrilla_id: 2,
  capataz_id: 12,
  fecha: '2026-11-10',
  estado: 'Abierto',
  tipo_actividad_id: 5,
  area_verde_id: 7,
  fecha_hora_actividad: '2026-11-10T08:30:00-05:00',
  encargo_id: null,
  observaciones: 'Se completó el sector norte',
  clase_actividad_id: 1,
  fecha_solicitud: null,
  incidencia_id: null,
  superficie_m2: 24,
  cantidad_solicitada: null,
  cantidad_ejecutada: null,
  unidad_medida_id: null,
  tiempo_minutos: 45,
  verificacion_observaciones: null,
  verificado_por_usuario_id: null,
  verificado_por_nombre: null,
  fecha_verificacion: null,
  ejemplar_id: null,
  ejemplar_codigo: null,
  ejemplar_altura_m: null,
  pendiente_vinculacion: false,
  cuadrilla_nombre: 'Cuadrilla Norte',
  tipo_actividad_nombre: 'Riego manual',
  area_verde_nombre: 'Jardín central',
  participantes: { actividad_id: 8, cantidad_operarios: 1, operarios: [operario] },
}

const pagina = (results: unknown[]) => ({ count: results.length, results, next: null, previous: null })

it('muestra una tabla compacta y permite al capataz actualizar participantes desde el detalle', async () => {
  let participantes = [operario]
  const escrituras: unknown[] = []
  vi.stubGlobal('fetch', vi.fn(async (ruta: string, opciones: RequestInit = {}) => {
    const url = new URL(ruta, 'http://localhost')
    if (url.pathname.endsWith('/cuadrillas/')) {
      return Response.json(pagina([{ id: 2, nombre: 'Cuadrilla Norte' }]))
    }
    if (url.pathname.endsWith('/actividades/')) return Response.json(pagina([actividad]))
    if (url.pathname.endsWith('/operarios-disponibles/')) {
      return Response.json([operario, { id: 22, nombres: 'Luis', apellidos: 'Rojas', activo: true }])
    }
    if (url.pathname.endsWith('/participantes/')) {
      if (opciones.method === 'PUT') {
        const cuerpo = JSON.parse(String(opciones.body)) as { operarios: number[] }
        escrituras.push(cuerpo)
        participantes = cuerpo.operarios.includes(22)
          ? [operario, { id: 22, nombres: 'Luis', apellidos: 'Rojas', activo: true }]
          : [operario]
      }
      return Response.json({ actividad_id: 8, cantidad_operarios: participantes.length, operarios: participantes })
    }
    return Response.json(pagina([]))
  }))

  render(<MemoryRouter><ParticipantesPage /></MemoryRouter>)
  const usuario = userEvent.setup()
  const tabla = await screen.findByRole('table', { name: 'Actividades y operarios participantes' })
  expect(within(tabla).getAllByRole('columnheader')).toHaveLength(5)
  expect(within(tabla).queryByRole('columnheader', { name: 'Operarios' })).toBeNull()
  expect(within(tabla).queryByRole('columnheader', { name: 'Verificación' })).toBeNull()

  await usuario.click(within(tabla).getByRole('button', { name: 'Ver detalle de Riego manual' }))
  expect(await screen.findByText('Se completó el sector norte')).toBeTruthy()
  expect(screen.getByText('Ana Quispe')).toBeTruthy()
  expect(screen.queryByText('8')).toBeNull()

  await usuario.click(screen.getByRole('button', { name: 'Gestionar participantes' }))
  await usuario.click(await screen.findByRole('checkbox', { name: /Luis Rojas/ }))
  await usuario.click(screen.getByRole('button', { name: 'Guardar participantes' }))

  await waitFor(() => expect(escrituras).toEqual([{ operarios: [21, 22] }]))
})

it('ubica la acción autorizada junto a los datos de verificación', async () => {
  sesionPrueba.rol = 'Jefe de sección'
  sesionPrueba.permisos = JEFE
  vi.stubGlobal('fetch', vi.fn(async (ruta: string) => {
    const url = new URL(ruta, 'http://localhost')
    if (url.pathname.endsWith('/cuadrillas/')) return Response.json(pagina([{ id: 2, nombre: 'Cuadrilla Norte' }]))
    if (url.pathname.endsWith('/actividades/')) return Response.json(pagina([actividad]))
    return Response.json(pagina([]))
  }))

  render(<MemoryRouter><ParticipantesPage /></MemoryRouter>)
  const usuario = userEvent.setup()
  const tabla = await screen.findByRole('table', { name: 'Actividades y operarios participantes' })
  await usuario.click(within(tabla).getByRole('button', { name: 'Ver detalle de Riego manual' }))

  const registro = screen.getByRole('heading', { name: 'Registro complementario' }).closest('section')
  const verificacion = screen.getByRole('heading', { name: 'Verificación' }).closest('section')
  expect(registro).not.toBeNull()
  expect(verificacion).not.toBeNull()
  expect(within(registro as HTMLElement).queryByRole('button', { name: 'Verificar actividad' })).toBeNull()
  expect(within(verificacion as HTMLElement).getByRole('button', { name: 'Verificar actividad' })).toBeTruthy()
})
