// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import type { ContratoMaestro } from '@/types/maestrosTercerizados'
import { rutasProveedores } from './rutas'
import { RUTA_PROVEEDORES } from './enlaces'
import { VER_MONTOS } from './permisos'
import { seccionProveedores } from './seccion'

const permisosSesion = vi.hoisted(() => ({ valor: [] as string[] | null }))
vi.mock('@/sesion/ContextoSesion', () => ({
  usePermisos: () => permisosSesion.valor,
}))

const api = vi.hoisted(() => ({
  listarContratosMaestro: vi.fn(),
  obtenerContrato: vi.fn(),
  registrarContrato: vi.fn(),
  editarContrato: vi.fn(),
  listarProveedoresMaestro: vi.fn(),
  listarAtenciones: vi.fn(),
  listarTiposServicio: vi.fn(),
}))
vi.mock('@/services/api/maestrosTercerizados', () => ({
  listarContratosMaestro: api.listarContratosMaestro,
  obtenerContrato: api.obtenerContrato,
  registrarContrato: api.registrarContrato,
  editarContrato: api.editarContrato,
  listarProveedoresMaestro: api.listarProveedoresMaestro,
}))
vi.mock('@/services/api/tercerizados', () => ({
  listarAtenciones: api.listarAtenciones,
  listarTiposServicio: api.listarTiposServicio,
  listarTodo: async (pagina: (n: number | undefined) => Promise<{ results: unknown[] }>) => ({
    resultados: (await pagina(undefined)).results,
    completo: true,
  }),
}))
vi.mock('@/components/core/HistorialCambios', () => ({ default: () => null }))
vi.mock('@/components/core/Adjuntos', () => ({ default: () => null }))

const CONSULTAR = 'SER.CONTRATO.CONSULTAR'
const GESTIONAR = 'SER.CONTRATO.GESTIONAR'
const GESTIONAR_ATENCION = 'SER.ATENCION.GESTIONAR'

function atencion(id: number, estado: string) {
  return {
    id,
    codigo: `AT-00${id}`,
    descripcion: `Atención ${id}`,
    estado,
    origen: 'Demanda',
    unidad_solicitante_nombre: null,
    es_riesgo: false,
    fecha_creacion: '2026-03-01T10:00:00-05:00',
  }
}

beforeEach(() => {
  permisosSesion.valor = [CONSULTAR]
  api.listarTiposServicio.mockResolvedValue({
    count: 0,
    next: null,
    previous: null,
    results: [],
  })
  api.listarAtenciones.mockResolvedValue({
    count: 0,
    next: null,
    previous: null,
    results: [],
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function contrato(
  id: number,
  numero: string,
  extra: Partial<ContratoMaestro> & Record<string, unknown> = {},
): ContratoMaestro {
  return {
    id,
    numero,
    proveedor_id: 1,
    proveedor_nombre: 'Terraverde SAC',
    tipo_servicio_id: 1,
    tipo_servicio_nombre: 'Corte de césped',
    vigencia_inicio: '2026-01-01',
    vigencia_fin: '2026-12-31',
    area_metrado_estimado: '1200 m²',
    monto_fijo: '8500.00',
    frecuencia_pactada: '4 veces al año',
    frecuencia_cantidad: 4,
    frecuencia_unidad: 'Anio',
    condiciones: '',
    vigente: true,
    atenciones: 4,
    ...extra,
  } as ContratoMaestro
}

function pagina(...contratos: ContratoMaestro[]) {
  return {
    count: contratos.length,
    next: null,
    previous: null,
    results: contratos,
  }
}

function montar(entrada = RUTA_PROVEEDORES) {
  const enrutador = createMemoryRouter([{ path: '/n', children: rutasProveedores }], { initialEntries: [entrada] })
  render(<RouterProvider router={enrutador} />)
  return enrutador
}

describe('Proveedores · contratos (RD-49)', () => {
  it('sin el permiso de consulta muestra «sin acceso» y no pide nada', () => {
    permisosSesion.valor = []
    montar()
    expect(screen.getByText('No puedes ver los contratos')).toBeTruthy()
    expect(api.listarContratosMaestro).not.toHaveBeenCalled()
  })

  it('lista los contratos con su avance; los vencidos quedan como histórico', async () => {
    api.listarContratosMaestro.mockResolvedValue(
      pagina(
        contrato(1, 'CT-001', {
          atenciones_conformes: 3,
          atenciones_observadas: 1,
          atenciones_pendientes: 0,
        }),
        contrato(2, 'CT-002', { vigente: false, vigencia_fin: '2025-12-31' }),
      ),
    )
    montar()
    const primero = await screen.findByRole('link', { name: /CT-001/ })
    expect(within(primero).getByText('3 de 4 conformes')).toBeTruthy()
    const vencido = screen.getByRole('link', { name: /CT-002/ })
    expect(within(vencido).getByText('Vencido · histórico')).toBeTruthy()
    expect(within(vencido).getByText('El avance se calcula al abrir el contrato')).toBeTruthy()
  })

  it('los montos solo se ven con VER_MONTOS', async () => {
    api.listarContratosMaestro.mockResolvedValue(pagina(contrato(1, 'CT-001')))
    montar()
    await screen.findByRole('link', { name: /CT-001/ })
    expect(screen.queryByText(/8\s?500/)).toBeNull()
    cleanup()
    permisosSesion.valor = [CONSULTAR, VER_MONTOS]
    montar()
    expect(await screen.findByText(/S\/\s8\s?500/)).toBeTruthy()
  })

  it('«Nuevo contrato» solo aparece con el permiso de gestión y abre el panel de alta', async () => {
    api.listarContratosMaestro.mockResolvedValue(pagina(contrato(1, 'CT-001')))
    montar()
    await screen.findByRole('link', { name: /CT-001/ })
    expect(screen.queryByRole('button', { name: 'Nuevo contrato' })).toBeNull()
    cleanup()
    permisosSesion.valor = [CONSULTAR, GESTIONAR]
    const router = montar()
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Nuevo contrato' }))
    expect(router.state.location.search).toBe('?contrato=nuevo')
    expect(await screen.findByRole('form', { name: 'Nuevo contrato' })).toBeTruthy()
  })

  it('abre el panel del contrato con el avance calculado a partir de sus atenciones (sin RD-16)', async () => {
    api.listarContratosMaestro.mockResolvedValue(pagina(contrato(1, 'CT-001')))
    api.obtenerContrato.mockResolvedValue(contrato(1, 'CT-001'))
    api.listarAtenciones.mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: [
        {
          id: 10,
          codigo: 'AT-0010',
          descripcion: 'Corte',
          estado: 'Conforme / cerrado',
          es_riesgo: false,
          fecha_creacion: '2026-03-01T10:00:00-05:00',
        },
        {
          id: 11,
          codigo: 'AT-0011',
          descripcion: 'Poda',
          estado: 'En ejecución',
          es_riesgo: false,
          fecha_creacion: '2026-04-01T10:00:00-05:00',
        },
      ],
    })
    const router = montar()
    await userEvent.setup().click(await screen.findByRole('link', { name: /CT-001/ }))
    expect(router.state.location.search).toBe('?contrato=1')
    const panel = await screen.findByRole('complementary', { name: 'CT-001' })
    expect(await within(panel).findByText('1 de 2 atenciones conformes')).toBeTruthy()
    await userEvent.setup().click(within(panel).getByRole('tab', { name: 'Atenciones' }))
    expect(within(panel).getByRole('link', { name: /AT-0010/ })).toBeTruthy()
    expect(
      within(panel).getByRole('link', { name: 'Ver el informe del servicio en Reportes' }).getAttribute('href'),
    ).toContain('/n/reportes?informe=')
    expect(within(panel).queryByRole('button', { name: 'Editar contrato' })).toBeNull()
  })

  it('con el avance del backend (RD-16) no recorre todas las atenciones y ofrece registrar una', async () => {
    permisosSesion.valor = [CONSULTAR, GESTIONAR_ATENCION]
    const conAvance = contrato(1, 'CT-001', {
      atenciones: 30,
      atenciones_conformes: 12,
      atenciones_observadas: 2,
      atenciones_pendientes: 3,
    })
    api.listarContratosMaestro.mockResolvedValue(pagina(conAvance))
    api.obtenerContrato.mockResolvedValue(conAvance)
    api.listarAtenciones.mockResolvedValue({
      count: 30,
      next: 'siguiente',
      previous: null,
      results: [atencion(10, 'Observado')],
    })
    montar('/n/proveedores?contrato=1')
    const panel = await screen.findByRole('complementary', { name: 'CT-001' })
    expect(await within(panel).findByText('12 de 30 atenciones conformes')).toBeTruthy()
    expect(within(panel).getByText('13 sin informe')).toBeTruthy()
    await userEvent.setup().click(within(panel).getByRole('tab', { name: 'Atenciones' }))
    expect(await within(panel).findByText('30 atenciones registradas')).toBeTruthy()
    expect(within(panel).getByRole('link', { name: 'Registrar atención' }).getAttribute('href')).toBe(
      '/servicios-tercerizados/atenciones/nueva',
    )
    // Solo la página visible de atenciones: el avance ya viene del backend.
    expect(api.listarAtenciones).toHaveBeenCalledTimes(1)
    expect(api.listarAtenciones).toHaveBeenCalledWith({ contrato_id: 1 }, 1, expect.anything())
  })

  it('un contrato vencido no ofrece registrar atenciones', async () => {
    permisosSesion.valor = [CONSULTAR, GESTIONAR_ATENCION]
    const vencido = contrato(2, 'CT-002', { vigente: false })
    api.listarContratosMaestro.mockResolvedValue(pagina(vencido))
    api.obtenerContrato.mockResolvedValue(vencido)
    montar('/n/proveedores?contrato=2')
    const panel = await screen.findByRole('complementary', { name: 'CT-002' })
    expect(within(panel).getByText('Vencido · histórico')).toBeTruthy()
    await userEvent.setup().click(within(panel).getByRole('tab', { name: 'Atenciones' }))
    expect(await within(panel).findByText('Este contrato aún no tiene atenciones')).toBeTruthy()
    expect(within(panel).queryByRole('link', { name: 'Registrar atención' })).toBeNull()
  })

  it('la pestaña Contratos de la sección lleva a la lista', () => {
    expect(seccionProveedores.pestanas[0]).toEqual({ etiqueta: 'Contratos', ruta: RUTA_PROVEEDORES })
  })

  it('con permiso de gestión el panel ofrece «Editar contrato»', async () => {
    permisosSesion.valor = [CONSULTAR, GESTIONAR]
    api.listarContratosMaestro.mockResolvedValue(pagina(contrato(1, 'CT-001')))
    api.obtenerContrato.mockResolvedValue(contrato(1, 'CT-001'))
    montar('/n/proveedores?contrato=1')
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Editar contrato' }))
    expect(await screen.findByRole('form', { name: 'Editar contrato' })).toBeTruthy()
  })

  it('el filtro de búsqueda queda en la URL y reinicia la página', async () => {
    api.listarContratosMaestro.mockResolvedValue(pagina(contrato(1, 'CT-001')))
    const router = montar('/n/proveedores?pagina=2')
    await userEvent.setup().type(await screen.findByLabelText('Buscar contratos'), 'terra{enter}')
    await waitFor(() => expect(router.state.location.search).toBe('?q=terra'))
  })

  it('muestra el estado vacío, el error con reintento y el 403', async () => {
    api.listarContratosMaestro.mockResolvedValueOnce(pagina())
    montar()
    expect(await screen.findByText('Aún no hay contratos registrados')).toBeTruthy()
    cleanup()

    api.listarContratosMaestro
      .mockRejectedValueOnce(new ErrorApi(500, null, 'Falló el servidor'))
      .mockResolvedValueOnce(pagina(contrato(1, 'CT-001')))
    montar()
    expect(await screen.findByText('No pudimos cargar los contratos')).toBeTruthy()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('link', { name: /CT-001/ })).toBeTruthy()
    cleanup()

    api.listarContratosMaestro.mockRejectedValueOnce(new ErrorApi(403, null, 'Prohibido'))
    montar()
    expect(await screen.findByText('Tu cuenta no tiene permiso para consultar contratos.')).toBeTruthy()
  })
})
