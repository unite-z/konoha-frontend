// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import type { Atencion, ReporteProveedor } from '@/types/tercerizados'
import { rutaSubirInforme } from '../enlaces'
import { rutasProveedores } from '../rutas'
import { sugerenciaDePrueba } from './sugerenciaDePrueba'

const permisosSesion = vi.hoisted(() => ({ valor: [] as string[] | null }))
vi.mock('@/sesion/ContextoSesion', () => ({ usePermisos: () => permisosSesion.valor }))

const api = vi.hoisted(() => ({
  listarAtenciones: vi.fn(),
  obtenerAtencion: vi.fn(),
  listarReportes: vi.fn(),
  obtenerFormatoReporte: vi.fn(),
  listarExtracciones: vi.fn(),
  solicitarExtraccion: vi.fn(),
  obtenerExtraccion: vi.fn(),
  validarExtraccion: vi.fn(),
  rechazarExtraccion: vi.fn(),
}))
vi.mock('@/services/api/tercerizados', async (original) => ({
  ...(await original<typeof import('@/services/api/tercerizados')>()),
  listarAtenciones: api.listarAtenciones,
  obtenerAtencion: api.obtenerAtencion,
  listarReportes: api.listarReportes,
  obtenerFormatoReporte: api.obtenerFormatoReporte,
}))
vi.mock('@/services/api/ia', async (original) => ({
  ...(await original<typeof import('@/services/api/ia')>()),
  listarExtracciones: api.listarExtracciones,
  solicitarExtraccion: api.solicitarExtraccion,
  obtenerExtraccion: api.obtenerExtraccion,
  validarExtraccion: api.validarExtraccion,
  rechazarExtraccion: api.rechazarExtraccion,
}))

const CONSULTAR = 'REP.INDICADOR.CONSULTAR'
const SOLICITAR = 'IA.PROPUESTA.PROPONER'
const VALIDAR = 'IA.PROPUESTA.VALIDAR'
const REGISTRAR = 'SER.ATENCION.REGISTRAR'

const pagina = <T,>(...results: T[]) => ({ count: results.length, next: null, previous: null, results })

function atencion(estado: string, id = 9): Atencion {
  return {
    id,
    codigo: `AT-2026-00${id}`,
    estado,
    proveedor_nombre: 'Terraverde SAC',
    tipo_servicio_nombre: 'Corte de césped',
    fecha_hora_fin: '2026-11-02T10:00:00-05:00',
    alcances: [],
    conformidades: [],
  } as unknown as Atencion
}

const reporte = {
  id: 71,
  atencion_id: 9,
  revision: 1,
  fecha_recepcion: '2026-11-03',
  resumen: '',
  documentos: [],
} as unknown as ReporteProveedor

function montar(entrada = rutaSubirInforme()) {
  const enrutador = createMemoryRouter([{ path: '/n', children: rutasProveedores }], { initialEntries: [entrada] })
  render(<RouterProvider router={enrutador} />)
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
  permisosSesion.valor = [CONSULTAR, SOLICITAR, VALIDAR, REGISTRAR]
  api.listarAtenciones.mockResolvedValue(pagina())
  api.obtenerAtencion.mockResolvedValue(atencion('Ejecutado pendiente de reporte'))
  api.listarReportes.mockResolvedValue(pagina(reporte))
  api.obtenerFormatoReporte.mockResolvedValue({ formato: null, datos_anteriores: null })
  api.listarExtracciones.mockResolvedValue(pagina())
  api.solicitarExtraccion.mockResolvedValue(sugerenciaDePrueba({ 1: 10, 2: 'ok' }))
  api.obtenerExtraccion.mockResolvedValue(sugerenciaDePrueba({ 1: 10, 2: 'ok' }))
  api.validarExtraccion.mockResolvedValue(sugerenciaDePrueba({ 1: 10, 2: 'ok' }, { estado: 'Validada' }))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Subir informe', () => {
  it('sin el permiso de los asistentes muestra «sin acceso»', () => {
    permisosSesion.valor = [REGISTRAR]
    montar()
    expect(screen.getByText('No puedes subir informes')).toBeTruthy()
    expect(api.listarAtenciones).not.toHaveBeenCalled()
  })

  it('sin informes ni atenciones que esperen informe muestra los estados vacíos', async () => {
    montar()
    expect(await screen.findByText('Aún no hay informes en la lista')).toBeTruthy()
    expect(await screen.findByText('Ninguna atención espera informe')).toBeTruthy()
    expect(await screen.findByText('Aún no hay propuestas')).toBeTruthy() // historial vacío
  })

  it('si no cargan las atenciones que esperan informe, ofrece reintentar', async () => {
    api.listarAtenciones.mockRejectedValue(new ErrorApi(500, null, 'Servidor caído'))
    montar()
    expect(await screen.findByText('No pudimos cargar las atenciones')).toBeTruthy()
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeTruthy()
  })

  it('con ?atencion_id= la atención espera informe: «coincide» y se puede subir', async () => {
    montar(rutaSubirInforme(9))
    expect(await screen.findByText('Coincide')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Subir informe' })).toBeTruthy()
    expect(api.obtenerAtencion).toHaveBeenCalledWith(9, expect.anything())
  })

  it('una atención que no espera informe queda «por revisar» y no deja subir', async () => {
    api.obtenerAtencion.mockResolvedValue(atencion('En ejecución'))
    montar(rutaSubirInforme(9))
    expect(await screen.findByText('Por revisar')).toBeTruthy()
    expect(screen.getByText(/está «En ejecución» y no espera un informe nuevo/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Subir informe' })).toBeNull()
  })

  it('una atención que no existe queda «por revisar»', async () => {
    api.obtenerAtencion.mockRejectedValue(new ErrorApi(404, null, 'No encontrada'))
    montar(rutaSubirInforme(9))
    expect(await screen.findByText('Por revisar')).toBeTruthy()
    expect(screen.getByText(/no existe o no se puede consultar/)).toBeTruthy()
  })

  it('si la atención no carga, muestra el error con reintento', async () => {
    api.obtenerAtencion.mockRejectedValue(new ErrorApi(500, null, 'Servidor caído'))
    montar(rutaSubirInforme(9))
    expect(await screen.findByText('No pudimos cargar la atención')).toBeTruthy()
  })

  it('añade una atención por su número y avisa si ya está en la lista', async () => {
    const usuario = userEvent.setup()
    montar()
    await screen.findByText('Aún no hay informes en la lista')
    await usuario.type(screen.getByLabelText('N.º de la atención'), '12')
    await usuario.click(screen.getByRole('button', { name: 'Añadir a la lista' }))
    expect(await screen.findByText('AT-2026-009')).toBeTruthy() // el mock responde siempre la 9
    expect(api.obtenerAtencion).toHaveBeenCalledWith(12, expect.anything())
    await usuario.type(screen.getByLabelText('N.º de la atención'), '12')
    await usuario.click(screen.getByRole('button', { name: 'Añadir a la lista' }))
    expect(await screen.findByText('Esa atención ya está en la lista')).toBeTruthy()
    await usuario.clear(screen.getByLabelText('N.º de la atención'))
    await usuario.type(screen.getByLabelText('N.º de la atención'), '0')
    await usuario.click(screen.getByRole('button', { name: 'Añadir a la lista' }))
    expect(await screen.findByText(/entero positivo/)).toBeTruthy()
  })

  it('el flujo de un informe por atención se conserva: analiza el informe adjunto y lo revisa', async () => {
    api.obtenerAtencion.mockResolvedValue(atencion('Reporte adjunto'))
    const usuario = userEvent.setup()
    montar(rutaSubirInforme(9))
    await usuario.click(await screen.findByRole('button', { name: 'Analizar el informe adjunto' }))
    await waitFor(() => expect(api.solicitarExtraccion).toHaveBeenCalledWith(71))
    expect(await screen.findByText('Propuesta n.º 55')).toBeTruthy()
    // La revisión se abre dentro de la fila con el núcleo de RevisionIa.
    expect(await screen.findByText('Konoha propone')).toBeTruthy()
    expect(api.obtenerExtraccion).toHaveBeenCalledWith(55, expect.anything())
  })

  it('sin permiso para pedir análisis no ofrece analizar', async () => {
    permisosSesion.valor = [CONSULTAR]
    api.obtenerAtencion.mockResolvedValue(atencion('Reporte adjunto'))
    montar(rutaSubirInforme(9))
    await screen.findByText('Por revisar')
    expect(screen.queryByRole('button', { name: 'Analizar el informe adjunto' })).toBeNull()
  })

  it('«Registrar en bloque» valida la propuesta completa y muestra el resultado por informe', async () => {
    api.obtenerAtencion.mockResolvedValue(atencion('Reporte adjunto'))
    const usuario = userEvent.setup()
    montar(rutaSubirInforme(9))
    await usuario.click(await screen.findByRole('button', { name: 'Analizar el informe adjunto' }))
    await screen.findByText('Propuesta n.º 55')
    await usuario.click(screen.getByRole('button', { name: 'Registrar en bloque' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Registrar en bloque' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Registrar en bloque' }))
    await waitFor(() =>
      expect(api.validarExtraccion).toHaveBeenCalledWith(55, {
        decisiones: { campo_1: { accion: 'aceptar' }, campo_2: { accion: 'aceptar' } },
      }),
    )
    expect(await screen.findByText(/1 de 1 propuestas registradas/)).toBeTruthy()
    expect(screen.getByText('Registrada')).toBeTruthy()
  })

  it('«Registrar en bloque» no valida las incompletas', async () => {
    api.obtenerAtencion.mockResolvedValue(atencion('Reporte adjunto'))
    api.obtenerExtraccion.mockResolvedValue(sugerenciaDePrueba({ 1: 10 }))
    const usuario = userEvent.setup()
    montar(rutaSubirInforme(9))
    await usuario.click(await screen.findByRole('button', { name: 'Analizar el informe adjunto' }))
    await screen.findByText('Propuesta n.º 55')
    await usuario.click(screen.getByRole('button', { name: 'Registrar en bloque' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Registrar en bloque' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Registrar en bloque' }))
    expect(await screen.findByText(/0 de 1 propuestas registradas/)).toBeTruthy()
    expect(screen.getByText(/No está completa/)).toBeTruthy()
    expect(api.validarExtraccion).not.toHaveBeenCalled()
  })

  it('sin permiso para validar no ofrece «Registrar en bloque»', async () => {
    permisosSesion.valor = [CONSULTAR, SOLICITAR, REGISTRAR]
    api.obtenerAtencion.mockResolvedValue(atencion('Reporte adjunto'))
    const usuario = userEvent.setup()
    montar(rutaSubirInforme(9))
    await usuario.click(await screen.findByRole('button', { name: 'Analizar el informe adjunto' }))
    await screen.findByText('Propuesta n.º 55')
    expect(screen.queryByRole('button', { name: 'Registrar en bloque' })).toBeNull()
  })

  it('el historial lista las extracciones por estado', async () => {
    api.listarExtracciones.mockResolvedValue(pagina(sugerenciaDePrueba({ 1: 10, 2: 'ok' })))
    montar()
    expect(await screen.findByText(/AT-2026-009 · Terraverde SAC/)).toBeTruthy()
  })
})
