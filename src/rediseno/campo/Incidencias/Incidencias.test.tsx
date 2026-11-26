// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import { vaciar } from '@/sincronizacion/almacenLocal'
import { leerEstadoCola, reiniciarColaParaPruebas } from '@/sincronizacion/cola'
import type { IncidenciaResumen, SeguimientoIncidencia } from '@/types/incidencias'
import { rutaCampoIncidencia, rutaCampoIncidencias, rutaCampoReportarIncidencia } from '../enlaces'
import { rutasCampo } from '../rutas'

const REGISTRAR = 'PLA.INCIDENCIA.REGISTRAR'
const estado = vi.hoisted(() => ({ permisos: [] as string[] }))
vi.mock('@/sesion/ContextoSesion', () => ({
  usePermisos: () => estado.permisos,
  useSesionActiva: () => ({
    usuario: { id: 4, nombre: 'J. Ramos', nombre_usuario: 'jramos' },
    rol: { codigo: 'capataz', nombre: 'Capataz' },
    permisos: estado.permisos,
  }),
  useSesion: () => ({ cerrarSesion: vi.fn() }),
}))

let lista: IncidenciaResumen[] | ErrorApi
let seguimiento: SeguimientoIncidencia | ErrorApi
const duplicados = vi.fn(async (..._a: unknown[]): Promise<unknown[]> => [])
const registrarIncidencia = vi.fn(async (..._a: unknown[]) => ({ id: 42, codigo: 'INC-2026-042' }))
const sumarReporte = vi.fn(async (..._a: unknown[]) => undefined)
vi.mock('@/services/api/incidencias', () => ({
  listarMisIncidencias: async () => {
    if (lista instanceof ErrorApi) throw lista
    return lista
  },
  obtenerMiIncidencia: async () => {
    if (seguimiento instanceof ErrorApi) throw seguimiento
    return seguimiento
  },
  obtenerCatalogosRegistro: async () => ({
    tipos: ['Rama caída', 'Hojarasca'],
    espacios: [{ nombre: 'Jardín de la Biblioteca', ejemplares: ['T-0412 · Ficus'] }],
    usuarios: [],
    espacio_sugerido: 'Jardín de la Biblioteca',
  }),
  buscarPosiblesDuplicados: (...a: unknown[]) => duplicados(...a),
  registrarIncidencia: (...a: unknown[]) => registrarIncidencia(...a),
  sumarReporte: (...a: unknown[]) => sumarReporte(...a),
}))
vi.mock('@/components/core/HistorialCambios', () => ({ default: () => null }))
vi.mock('@/components/core/Adjuntos', () => ({ default: () => null }))

function incidencia(id: number, tipo: string, estadoInc: IncidenciaResumen['estado']): IncidenciaResumen {
  return {
    id,
    codigo: `INC-2026-0${id}`,
    tipo,
    tipo_sencilla: false,
    espacio: 'Jardín de la Biblioteca',
    severidad: null,
    via: null,
    estado: estadoInc,
    canal: 'App',
    fecha_registro: '2020-01-02T10:00:00-05:00',
    fecha_cierre: null,
    responsable: null,
  }
}

function montar(ruta: string) {
  const router = createMemoryRouter([{ path: '/n', children: rutasCampo }], { initialEntries: [ruta] })
  render(<RouterProvider router={router} />)
  return router
}

const foto = new File(['x'], 'rama.jpg', { type: 'image/jpeg' })

async function rellenar() {
  const u = userEvent.setup()
  await u.click(await screen.findByRole('radio', { name: 'Rama caída' }))
  await u.upload(document.querySelector('input[type="file"]') as HTMLInputElement, foto)
  return u
}

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false
  }
})
beforeEach(() => {
  estado.permisos = [REGISTRAR]
  lista = [incidencia(7, 'Rama caída', 'EnAtencion')]
  seguimiento = {
    id: 7,
    codigo: 'INC-2026-07',
    tipo: 'Rama caída',
    estado: 'Cerrada',
    minutos_cierre: 150,
    pasos: [
      { estado: 'Cerrada', fecha_hora: '2020-01-02T12:30:00-05:00' },
      { estado: 'Registrada', fecha_hora: '2020-01-02T10:00:00-05:00' },
    ],
    evidencia: { url: null },
  }
})
afterEach(async () => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
  reiniciarColaParaPruebas()
  await vaciar('pendientes')
})

describe('Incidencias del capataz', () => {
  it('con permiso lista las incidencias propias con su estado', async () => {
    montar(rutaCampoIncidencias())
    expect(await screen.findByRole('heading', { name: 'Incidencias' })).toBeTruthy()
    const fila = await screen.findByRole('button', { name: /Rama caída/ })
    expect(within(fila).getByText('En atención')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Reportar/ })).toBeTruthy()
  })

  it('sin incidencias muestra el vacío', async () => {
    lista = []
    montar(rutaCampoIncidencias())
    expect(await screen.findByText('Aún no has reportado incidencias')).toBeTruthy()
  })

  it('si falla la carga ofrece reintentar', async () => {
    lista = new ErrorApi(500, 'x', 'Fallo del servidor')
    montar(rutaCampoIncidencias())
    expect(await screen.findByText('No pudimos cargar tus incidencias')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeTruthy()
  })

  it('sin el permiso o con 403 muestra «sin acceso»', async () => {
    estado.permisos = []
    montar(rutaCampoIncidencias())
    expect(await screen.findByText('No tienes acceso a las incidencias')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Reportar/ })).toBeNull()
    cleanup()
    estado.permisos = [REGISTRAR]
    lista = new ErrorApi(403, 'x', 'Prohibido')
    montar(rutaCampoIncidencias())
    expect(await screen.findByText('No tienes acceso a las incidencias')).toBeTruthy()
  })

  it('«Reportar» abre la hoja y sin foto no se puede enviar', async () => {
    montar(rutaCampoIncidencias())
    const u = userEvent.setup()
    await u.click(await screen.findByRole('button', { name: /Reportar/ }))
    await u.click(await screen.findByRole('radio', { name: 'Rama caída' }))
    expect(screen.getByText('Según tu ubicación')).toBeTruthy()
    await u.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(screen.getAllByText('Añade una foto.').length).toBeGreaterThan(0)
    expect(registrarIncidencia).not.toHaveBeenCalled()
  })

  it('con foto envía el reporte con una clave de idempotencia y avisa', async () => {
    montar(rutaCampoReportarIncidencia())
    const u = await rellenar()
    await u.type(screen.getByLabelText('Descripción'), 'Rama sobre el paso')
    await u.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(await screen.findByText('INC-2026-042 reportada')).toBeTruthy()
    const [cuerpo, archivo, clave] = registrarIncidencia.mock.calls[0]
    expect(cuerpo).toMatchObject({ tipo: 'Rama caída', espacio: 'Jardín de la Biblioteca', canal: 'App' })
    expect(archivo).toBeInstanceOf(File)
    expect(typeof clave).toBe('string')
  })

  it('con una incidencia abierta en el mismo espacio ofrece añadir a la existente', async () => {
    duplicados.mockResolvedValue([
      { id: 9, codigo: 'INC-2026-009', tipo: 'Rama caída', ejemplar: null, fecha_registro: new Date().toISOString() },
    ])
    montar(rutaCampoReportarIncidencia())
    const u = await rellenar()
    await u.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(await screen.findByText('Ya hay una incidencia abierta')).toBeTruthy()
    await u.click(screen.getByRole('button', { name: 'Añadir a la existente' }))
    expect(await screen.findByText('Añadido a INC-2026-009')).toBeTruthy()
    expect(sumarReporte).toHaveBeenCalledWith(9, '', expect.any(File))
    expect(registrarIncidencia).not.toHaveBeenCalled()
  })

  it('sin conexión queda «Pendiente de enviar» con su foto y su hora real', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    montar(rutaCampoReportarIncidencia())
    const u = await rellenar()
    await u.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(await screen.findByText('Sin conexión: se enviará al reconectar')).toBeTruthy()
    expect(registrarIncidencia).not.toHaveBeenCalled()
    expect(await screen.findByText('Pendiente de enviar')).toBeTruthy()
    const pendiente = leerEstadoCola().pendientes[0]
    expect(pendiente.archivo).toBeTruthy()
    expect((pendiente.carga.cuerpo as { reportado_en: string }).reportado_en).toBe(pendiente.creado_en)
    expect(screen.getByText('Sin conexión · se enviará al reconectar')).toBeTruthy()
  })

  it('con ?incidencia= abre el seguimiento con estados, tiempo de cierre y evidencia', async () => {
    montar(rutaCampoIncidencia(7))
    expect(await screen.findByText('INC-2026-07')).toBeTruthy()
    expect(await screen.findByText('2 h 30 min')).toBeTruthy()
    expect(screen.getByRole('list', { name: 'Seguimiento' })).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Evidencia sin foto' })).toBeTruthy()
  })

  it('el seguimiento sin acceso o inexistente lo dice', async () => {
    seguimiento = new ErrorApi(404, 'x', 'No existe')
    montar(rutaCampoIncidencia(99))
    expect(await screen.findByText('No existe esta incidencia')).toBeTruthy()
    cleanup()
    seguimiento = new ErrorApi(403, 'x', 'Prohibido')
    montar(rutaCampoIncidencia(7))
    expect(await screen.findByText('No tienes acceso a esta incidencia')).toBeTruthy()
  })
})
