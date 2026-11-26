// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import type { Atencion } from '@/types/tercerizados'
import { rutaAtencion, rutaAtenciones } from '../enlaces'
import { rutasProveedores } from '../rutas'

const permisosSesion = vi.hoisted(() => ({ valor: [] as string[] | null }))
vi.mock('@/sesion/ContextoSesion', () => ({
  usePermisos: () => permisosSesion.valor,
  useSesionActiva: () => null,
}))

const api = vi.hoisted(() => ({
  obtenerAtencion: vi.fn(),
  registrarConformidad: vi.fn(),
  listarAtenciones: vi.fn(),
  listarContratos: vi.fn(),
  listarAreasVerdes: vi.fn(),
  listarReportes: vi.fn(),
}))
vi.mock('@/services/api/tercerizados', async (original) => ({
  ...(await original<typeof import('@/services/api/tercerizados')>()),
  obtenerAtencion: api.obtenerAtencion,
  registrarConformidad: api.registrarConformidad,
  listarAtenciones: api.listarAtenciones,
  listarContratos: api.listarContratos,
  listarAreasVerdes: api.listarAreasVerdes,
  listarReportes: api.listarReportes,
}))
vi.mock('@/components/core/HistorialCambios', () => ({ default: () => null }))
vi.mock('@/components/core/Adjuntos', () => ({ default: () => null }))
vi.mock('@/pages/servicios-tercerizados/DocumentosProveedor', () => ({ default: () => null }))

const REGISTRAR = 'SER.ATENCION.REGISTRAR'
const GESTIONAR = 'SER.ATENCION.GESTIONAR'
const CONFORMIDAD = 'SER.CONFORMIDAD.REGISTRAR'

function atencion(estado: string, extra: Partial<Atencion> = {}): Atencion {
  return {
    id: 7,
    codigo: 'AT-2026-007',
    descripcion: 'Poda de ficus',
    contrato_numero: 'CT-01',
    proveedor_nombre: 'Terraverde SAC',
    tipo_servicio_nombre: 'Poda',
    clase: 'ProgramadaContrato',
    origen: 'Demanda',
    estado,
    es_riesgo: false,
    alcances: [],
    productos: [],
    plagas: [],
    historial: [],
    conformidades: [],
    verificaciones_seguridad: [],
    numero_orden_compra: 'OC-1',
    fecha_hora_inicio: '2026-11-20T08:00:00-05:00',
    fecha_hora_fin: '2026-11-20T12:00:00-05:00',
    fecha_creacion: '2026-11-01T10:00:00-05:00',
    fecha_modificacion: '2026-11-20T12:00:00-05:00',
    ...extra,
  } as unknown as Atencion
}

function montar(entrada: string) {
  const enrutador = createMemoryRouter([{ path: '/n', children: rutasProveedores }], { initialEntries: [entrada] })
  render(<RouterProvider router={enrutador} />)
  return enrutador
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
  permisosSesion.valor = [REGISTRAR, GESTIONAR, CONFORMIDAD]
  api.listarAtenciones.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
  api.listarContratos.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
  api.listarReportes.mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Proveedores · atención abierta (RD-53)', () => {
  it('sin permiso muestra «sin acceso» y no consulta', () => {
    permisosSesion.valor = []
    montar(rutaAtencion(7))
    expect(screen.getByText('No puedes ver esta atención')).toBeTruthy()
    expect(api.obtenerAtencion).not.toHaveBeenCalled()
  })

  it('un 403 del servidor muestra «sin acceso»', async () => {
    api.obtenerAtencion.mockRejectedValue(new ErrorApi(403, null, 'Prohibido'))
    montar(rutaAtencion(7))
    expect(await screen.findByText('No puedes ver esta atención')).toBeTruthy()
  })

  it('un 404 o un id inválido muestran el estado vacío con enlace a la bandeja', async () => {
    api.obtenerAtencion.mockRejectedValue(new ErrorApi(404, null, 'No existe'))
    montar(rutaAtencion(7))
    expect(await screen.findByText('No existe esta atención')).toBeTruthy()
    cleanup()
    montar('/n/proveedores/atenciones/abc')
    expect(await screen.findByText('No existe esta atención')).toBeTruthy()
  })

  it('un error de carga permite reintentar', async () => {
    api.obtenerAtencion.mockRejectedValueOnce(new ErrorApi(500, null, 'Fallo'))
    api.obtenerAtencion.mockResolvedValue(atencion('En ejecución'))
    montar(rutaAtencion(7))
    await userEvent.click(await screen.findByRole('button', { name: /reintentar/i }))
    expect(await screen.findByRole('heading', { name: 'Poda de ficus' })).toBeTruthy()
  })

  it('«Aprobar» sin informe previo está deshabilitada y lo explica (RN-007)', async () => {
    api.obtenerAtencion.mockResolvedValue(atencion('Ejecutado pendiente de reporte'))
    montar(rutaAtencion(7))
    const grupo = await screen.findByRole('group', { name: 'Acciones de la atención' })
    const aprobar = within(grupo).getByRole('button', { name: 'Aprobar' })
    expect(aprobar.getAttribute('aria-disabled')).toBe('true')
    const motivo = screen.getByText(/No hay conformidad sin informe previo/)
    const observar = within(grupo).getByRole('button', { name: 'Pedir foto u observar' })
    // Un solo motivo, citado por las dos decisiones.
    expect(aprobar.getAttribute('aria-describedby')).toBe(motivo.closest('li')?.id)
    expect(observar.getAttribute('aria-describedby')).toBe(motivo.closest('li')?.id)
  })

  it('con el informe adjunto la acción principal es «Aprobar» y va primero', async () => {
    api.obtenerAtencion.mockResolvedValue(atencion('Reporte adjunto'))
    montar(rutaAtencion(7))
    const grupo = await screen.findByRole('group', { name: 'Acciones de la atención' })
    const [primera] = within(grupo).getAllByRole('button')
    expect(primera.textContent).toBe('Aprobar')
    expect(primera.getAttribute('aria-disabled')).not.toBe('true')
  })

  it('«Pedir foto u observar» registra una observación y la atención queda «Observado»', async () => {
    api.obtenerAtencion.mockResolvedValue(atencion('Reporte adjunto'))
    api.registrarConformidad.mockResolvedValue(atencion('Observado', { conformidades: [{ id: 1 }] as never }))
    montar(rutaAtencion(7))
    await userEvent.click(await screen.findByRole('button', { name: 'Pedir foto u observar' }))
    const dialogo = await screen.findByRole('dialog')
    expect((within(dialogo).getByLabelText(/Qué debe corregir/) as HTMLTextAreaElement).value).toBe(
      'Falta evidencia fotográfica.',
    )
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Registrar observación' }))
    await waitFor(() =>
      expect(api.registrarConformidad).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ resultado: 'Observada', comentarios: 'Falta evidencia fotográfica.' }),
      ),
    )
    expect(await screen.findByText(/La atención quedó observada/)).toBeTruthy()
  })

  it('«Aprobar» con informe registra la conformidad', async () => {
    api.obtenerAtencion.mockResolvedValue(atencion('Reporte adjunto'))
    api.registrarConformidad.mockResolvedValue(atencion('Conforme / cerrado', { conformidades: [{ id: 1 }] as never }))
    montar(rutaAtencion(7))
    await userEvent.click(await screen.findByRole('button', { name: 'Aprobar' }))
    const dialogo = await screen.findByRole('dialog')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Aprobar' }))
    await waitFor(() =>
      expect(api.registrarConformidad).toHaveBeenCalledWith(7, expect.objectContaining({ resultado: 'Conforme' })),
    )
  })

  it('sin permiso de conformidad no se ofrecen las decisiones', async () => {
    permisosSesion.valor = [REGISTRAR]
    api.obtenerAtencion.mockResolvedValue(atencion('Reporte adjunto'))
    montar(rutaAtencion(7))
    await screen.findByRole('heading', { name: 'Poda de ficus' })
    expect(screen.queryByRole('button', { name: 'Aprobar' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Pedir foto u observar' })).toBeNull()
  })

  it('las acciones por estado salen deshabilitadas con su motivo: inicio sin verificación de seguridad', async () => {
    permisosSesion.valor = [REGISTRAR]
    api.obtenerAtencion.mockResolvedValue(atencion('OC referenciada', { es_riesgo: true }))
    montar(rutaAtencion(7))
    const inicio = await screen.findByRole('button', { name: 'Registrar inicio' })
    expect(inicio.getAttribute('aria-disabled')).toBe('true')
    expect(screen.getByText(/registra primero la verificación de seguridad/)).toBeTruthy()
  })

  it('«Corregir origen» solo aparece para la jefatura antes del inicio', async () => {
    api.obtenerAtencion.mockResolvedValue(atencion('OC referenciada'))
    montar(rutaAtencion(7))
    expect(await screen.findByRole('button', { name: 'Corregir origen' })).toBeTruthy()
    cleanup()
    permisosSesion.valor = [REGISTRAR]
    montar(rutaAtencion(7))
    await screen.findByRole('button', { name: 'Registrar inicio' })
    expect(screen.queryByRole('button', { name: 'Corregir origen' })).toBeNull()
  })

  it('`?atencion_id=` en la bandeja lleva a la ficha; uno inválido deja la bandeja', async () => {
    api.obtenerAtencion.mockResolvedValue(atencion('En ejecución'))
    const enrutador = montar(`${rutaAtenciones()}?atencion_id=7`)
    expect(await screen.findByRole('heading', { name: 'Poda de ficus' })).toBeTruthy()
    expect(enrutador.state.location.pathname).toBe(rutaAtencion(7))
    cleanup()
    montar(`${rutaAtenciones()}?atencion_id=x`)
    expect(await screen.findByRole('heading', { name: 'Atenciones' })).toBeTruthy()
  })

  it('«Volver a la bandeja» usa la ruta que dejó la fila', async () => {
    api.obtenerAtencion.mockResolvedValue(atencion('En ejecución'))
    const enrutador = createMemoryRouter([{ path: '/n', children: rutasProveedores }], {
      initialEntries: [{ pathname: rutaAtencion(7), state: { volverA: rutaAtenciones({ clase: 'Extraordinaria' }) } }],
    })
    render(<RouterProvider router={enrutador} />)
    const enlace = await screen.findByRole('link', { name: 'Volver a la bandeja' })
    expect(enlace.getAttribute('href')).toBe(rutaAtenciones({ clase: 'Extraordinaria' }))
  })
})
