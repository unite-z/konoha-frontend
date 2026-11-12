// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import ParticipantesPage from './ParticipantesPage'

// Permisos de MOD-04 de cada rol (V9): la pantalla decide por ellos (AV-382).
const CAPATAZ = ['CAM.CUADRILLA.CONSULTAR', 'CAM.PARTE.REGISTRAR']
const JEFE = [
  'CAM.CUADRILLA.GESTIONAR',
  'CAM.CUADRILLA.CONSULTAR',
  'CAM.PARTE.CONSULTAR',
  'CAM.PARTE.VERIFICAR',
  'CAM.PARTE.ANULAR',
]
const sesionPrueba = vi.hoisted(() => ({ rol: 'Capataz', permisos: [] as string[] }))

vi.mock('@/sesion/ContextoSesion', () => ({
  usePermisos: () => sesionPrueba.permisos,
  useSesionActiva: () => ({ usuario: { id: 4, nombre: 'Prueba' } }),
}))
vi.mock('@/sesion/ContextoSesionCampo', () => ({
  useSesionCampo: () => ({ usuario: { id: 4, rol: sesionPrueba.rol, personal_id: 12 } }),
}))

vi.mock('@/components/core/ExportarExcel', () => ({ default: () => null }))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close ??= function () {
    this.open = false
  }
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
  estado_actividad: 'Registrada',
  anulada_en: null,
  anulada_por_usuario_id: null,
  anulada_por_nombre: null,
  anulacion_motivo: null,
  ejemplar_id: null,
  ejemplar_codigo: null,
  ejemplar_altura_m: null,
  pendiente_vinculacion: false,
  cuadrilla_nombre: 'Cuadrilla Norte',
  tipo_actividad_nombre: 'Riego manual',
  area_verde_nombre: 'Jardín central',
  participantes: { actividad_id: 8, cantidad_operarios: 1, operarios: [operario] },
}

const pagina = (results: unknown[], pendientesVerificacion = results.length) => ({
  count: results.length,
  results,
  next: null,
  previous: null,
  pendientes_verificacion: pendientesVerificacion,
})

it('muestra una tabla compacta y permite al capataz actualizar participantes desde el detalle', async () => {
  let participantes = [operario]
  const escrituras: unknown[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (ruta: string, opciones: RequestInit = {}) => {
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
    }),
  )

  render(
    <MemoryRouter>
      <ParticipantesPage />
    </MemoryRouter>,
  )
  const usuario = userEvent.setup()
  const tabla = await screen.findByRole('table', { name: 'Actividades y operarios participantes' })
  expect(within(tabla).getAllByRole('columnheader')).toHaveLength(6)
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
  vi.stubGlobal(
    'fetch',
    vi.fn(async (ruta: string) => {
      const url = new URL(ruta, 'http://localhost')
      if (url.pathname.endsWith('/cuadrillas/')) return Response.json(pagina([{ id: 2, nombre: 'Cuadrilla Norte' }]))
      if (url.pathname.endsWith('/actividades/')) return Response.json(pagina([actividad]))
      return Response.json(pagina([]))
    }),
  )

  render(
    <MemoryRouter>
      <ParticipantesPage />
    </MemoryRouter>,
  )
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

it('avisa de las actividades pendientes, filtra por estado y amplía el diálogo de fotografías', async () => {
  sesionPrueba.rol = 'Jefe de sección'
  sesionPrueba.permisos = JEFE
  const verificada = {
    ...actividad,
    id: 9,
    tipo_actividad_nombre: 'Limpieza de sendero',
    fecha_verificacion: '2026-11-10T12:00:00-05:00',
    verificado_por_usuario_id: 4,
    verificado_por_nombre: 'Jefa de sección',
    verificacion_observaciones: 'Trabajo conforme',
    estado_actividad: 'Verificada',
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (ruta: string) => {
      const url = new URL(ruta, 'http://localhost')
      if (url.pathname.endsWith('/cuadrillas/')) return Response.json(pagina([{ id: 2, nombre: 'Cuadrilla Norte' }]))
      if (url.pathname.endsWith('/actividades/')) {
        const estado = url.searchParams.get('estado_actividad')
        const resultados =
          estado === 'Registrada' ? [actividad] : estado === 'Verificada' ? [verificada] : [actividad, verificada]
        return Response.json(pagina(resultados, 1))
      }
      if (url.pathname.includes('/adjuntos')) return Response.json([])
      return Response.json(pagina([]))
    }),
  )

  render(
    <MemoryRouter>
      <ParticipantesPage />
    </MemoryRouter>,
  )
  const usuario = userEvent.setup()

  expect(await screen.findByText('1 actividad pendiente de verificación')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).toBeNull()
  await usuario.click(screen.getByRole('button', { name: 'Ver pendientes' }))
  expect((screen.getByLabelText('Estado de la actividad') as HTMLSelectElement).value).toBe('Registrada')
  await usuario.click(screen.getByRole('button', { name: 'Cerrar aviso' }))
  expect(screen.queryByText('1 actividad pendiente de verificación')).toBeNull()
  await usuario.selectOptions(screen.getByLabelText('Estado de la actividad'), 'Verificada')
  expect(screen.queryByText('1 actividad pendiente de verificación')).toBeNull()

  const tabla = await screen.findByRole('table', { name: 'Actividades y operarios participantes' })
  await waitFor(() => expect(within(tabla).queryByText('Riego manual')).toBeNull())
  expect(within(tabla).getByText('Limpieza de sendero')).toBeTruthy()

  await usuario.click(within(tabla).getByRole('button', { name: 'Ver detalle de Limpieza de sendero' }))
  await usuario.click(screen.getByRole('button', { name: 'Ver fotografías' }))
  expect(screen.getByRole('dialog', { name: 'Fotografías de la actividad' }).className).toMatch(/amplio/)
})

it('mantiene la actividad anulada consultable y bloquea sus acciones de modificación', async () => {
  sesionPrueba.permisos = CAPATAZ
  const anulada = {
    ...actividad,
    estado_actividad: 'Anulada',
    anulada_en: '2026-11-10T13:00:00-05:00',
    anulada_por_usuario_id: 1,
    anulada_por_nombre: 'Jefe de sección',
    anulacion_motivo: 'Registro duplicado',
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (ruta: string) => {
      const url = new URL(ruta, 'http://localhost')
      if (url.pathname.endsWith('/cuadrillas/')) return Response.json(pagina([{ id: 2, nombre: 'Cuadrilla Norte' }], 0))
      if (url.pathname.endsWith('/actividades/')) return Response.json(pagina([anulada], 0))
      if (url.pathname.endsWith('/operarios-disponibles/')) return Response.json([operario])
      if (url.pathname.endsWith('/participantes/')) return Response.json(anulada.participantes)
      return Response.json([])
    }),
  )

  render(
    <MemoryRouter>
      <ParticipantesPage />
    </MemoryRouter>,
  )
  const usuario = userEvent.setup()
  const tabla = await screen.findByRole('table', { name: 'Actividades y operarios participantes' })
  expect(within(tabla).getByText('Anulada')).toBeTruthy()
  await usuario.click(within(tabla).getByRole('button', { name: 'Ver detalle de Riego manual' }))
  expect(screen.getByText('Registro duplicado')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Ver participantes' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Gestionar participantes' })).toBeNull()
})
