// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import type { Atencion } from '@/types/tercerizados'
import { RUTA_PROVEEDORES, rutaAtenciones } from '../enlaces'
import { rutasProveedores } from '../rutas'
import { seccionProveedores } from '../seccion'

const permisosSesion = vi.hoisted(() => ({ valor: [] as string[] | null }))
vi.mock('@/sesion/ContextoSesion', () => ({
  usePermisos: () => permisosSesion.valor,
}))

const api = vi.hoisted(() => ({
  listarAtenciones: vi.fn(),
  listarContratos: vi.fn(),
  listarContratosMaestro: vi.fn(),
  obtenerContrato: vi.fn(),
  exportarListado: vi.fn(),
  guardarArchivo: vi.fn(),
}))
vi.mock('@/services/api/tercerizados', () => ({
  listarAtenciones: api.listarAtenciones,
  listarContratos: api.listarContratos,
}))
vi.mock('@/services/api/maestrosTercerizados', () => ({
  listarContratosMaestro: api.listarContratosMaestro,
  obtenerContrato: api.obtenerContrato,
}))
vi.mock('@/services/api/core', () => ({
  exportarListado: api.exportarListado,
}))
vi.mock('@/services/api/clienteReportesGestion', () => ({
  guardarArchivo: api.guardarArchivo,
}))

const CONSULTAR = 'SER.CONTRATO.CONSULTAR'
const ATENCIONES = 'SER.ATENCION.REGISTRAR'

function atencion(id: number, extra: Partial<Atencion> = {}): Atencion {
  return {
    id,
    codigo: `AT-2026-00${id}`,
    contrato_numero: 'CT-01',
    proveedor_nombre: 'Terraverde SAC',
    tipo_servicio_nombre: 'Corte de césped',
    clase: 'Programada',
    origen: 'Demanda',
    estado: 'En ejecución',
    es_riesgo: false,
    fecha_creacion: '2026-03-01T10:00:00-05:00',
    ...extra,
  } as Atencion
}

function pagina(...resultados: Atencion[]) {
  return {
    count: resultados.length,
    next: null,
    previous: null,
    results: resultados,
  }
}

function montar(entrada: string) {
  const enrutador = createMemoryRouter([{ path: '/n', children: rutasProveedores }], { initialEntries: [entrada] })
  render(<RouterProvider router={enrutador} />)
  return enrutador
}

beforeEach(() => {
  permisosSesion.valor = [CONSULTAR, ATENCIONES]
  api.listarAtenciones.mockResolvedValue(pagina(atencion(1), atencion(2, { es_riesgo: true })))
  api.listarContratosMaestro.mockResolvedValue({
    count: 0,
    next: null,
    previous: null,
    results: [],
  })
  api.listarContratos.mockResolvedValue({
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

describe('Proveedores · bandeja de atenciones (RD-51)', () => {
  it('la sección anuncia la pestaña Atenciones', () => {
    expect(seccionProveedores.pestanas.map((p) => p.etiqueta)).toEqual(['Contratos', 'Atenciones'])
  })

  it('sin permiso de atenciones muestra «sin acceso» y no consulta', () => {
    permisosSesion.valor = [CONSULTAR]
    montar(rutaAtenciones())
    expect(screen.getByText('No puedes ver las atenciones')).toBeTruthy()
    expect(api.listarAtenciones).not.toHaveBeenCalled()
  })

  it('con permiso lista las atenciones y marca el riesgo solo como etiqueta', async () => {
    montar(rutaAtenciones())
    const lista = await screen.findByRole('list', { name: 'Atenciones' })
    expect(within(lista).getAllByRole('link')).toHaveLength(2)
    expect(within(lista).getAllByText('Riesgo')).toHaveLength(1)
    expect(screen.queryByLabelText('Riesgo')).toBeNull()
    expect(api.listarAtenciones).toHaveBeenCalledWith({}, 1, expect.anything())
  })

  it('los filtros y la página de la URL llegan a la API; los inválidos se ignoran', async () => {
    montar(
      `${rutaAtenciones({ q: 'poda', origen: 'Demanda', clase: 'Extraordinaria', contrato_id: '7', pagina: '2' })}&estado=raro`,
    )
    await screen.findByRole('list', { name: 'Atenciones' })
    expect(api.listarAtenciones).toHaveBeenCalledWith(
      { q: 'poda', origen: 'Demanda', clase: 'Extraordinaria', contrato_id: 7 },
      2,
      expect.anything(),
    )
  })

  it('buscar escribe la consulta en la URL y vuelve a la primera página', async () => {
    const enrutador = montar(rutaAtenciones({ pagina: '3' }))
    api.listarAtenciones.mockResolvedValue(pagina(atencion(1)))
    await screen.findByRole('search', { name: 'Filtrar atenciones' })
    await userEvent.type(screen.getByLabelText('Buscar atenciones'), 'riego')
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    await waitFor(() => expect(enrutador.state.location.search).toBe('?q=riego'))
  })

  it('«Exportar Excel» descarga el listado con los filtros aplicados', async () => {
    api.exportarListado.mockResolvedValue(new Blob(['x']))
    montar(rutaAtenciones({ clase: 'Extraordinaria' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Exportar Excel' }))
    await waitFor(() => expect(api.guardarArchivo).toHaveBeenCalled())
    expect(api.exportarListado).toHaveBeenCalledWith('atenciones', {
      clase: 'Extraordinaria',
    })
  })

  it('«Subir informe» lleva a la subida de informes', async () => {
    const enrutador = montar(rutaAtenciones())
    await userEvent.click(await screen.findByRole('link', { name: 'Subir informe' }))
    expect(enrutador.state.location.pathname).toBe(`${RUTA_PROVEEDORES}/informes/subir`)
  })

  it('una fila abre la atención', async () => {
    const enrutador = montar(rutaAtenciones())
    const lista = await screen.findByRole('list', { name: 'Atenciones' })
    await userEvent.click(within(lista).getAllByRole('link')[0])
    expect(enrutador.state.location.pathname).toBe(`${RUTA_PROVEEDORES}/atenciones/1`)
  })

  it('sin atenciones enseña el vacío; con filtros, ofrece limpiarlos', async () => {
    api.listarAtenciones.mockResolvedValue(pagina())
    const enrutador = montar(rutaAtenciones({ origen: 'Demanda' }))
    expect(await screen.findByText('Sin atenciones con estos filtros')).toBeTruthy()
    await userEvent.click(screen.getAllByRole('button', { name: 'Limpiar filtros' })[0])
    await waitFor(() => expect(enrutador.state.location.search).toBe(''))
    expect(await screen.findByText('Aún no hay atenciones tercerizadas')).toBeTruthy()
  })

  it('ante un error ofrece reintentar', async () => {
    api.listarAtenciones.mockRejectedValueOnce(new ErrorApi(500, null, 'Fallo del servidor'))
    montar(rutaAtenciones())
    expect(await screen.findByText('No pudimos cargar las atenciones')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: /Reintentar/ }))
    expect(await screen.findByRole('list', { name: 'Atenciones' })).toBeTruthy()
  })

  it('un 403 del servidor se muestra como «sin acceso»', async () => {
    api.listarAtenciones.mockRejectedValue(new ErrorApi(403, null, 'Prohibido'))
    montar(rutaAtenciones())
    expect(await screen.findByText('No puedes ver las atenciones')).toBeTruthy()
  })

  it('la vista principal enseña las 5 atenciones recientes con enlace a la bandeja', async () => {
    api.listarAtenciones.mockResolvedValue(pagina(...[1, 2, 3, 4, 5, 6, 7].map((i) => atencion(i))))
    montar(RUTA_PROVEEDORES)
    const lista = await screen.findByRole('list', { name: 'Atenciones' })
    expect(within(lista).getAllByRole('link')).toHaveLength(5)
    expect(screen.getByRole('heading', { name: 'Atenciones recientes' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ver todas las atenciones' }).getAttribute('href')).toBe(rutaAtenciones())
  })

  it('la vista principal no muestra atenciones recientes sin el permiso', async () => {
    permisosSesion.valor = [CONSULTAR]
    montar(RUTA_PROVEEDORES)
    await waitFor(() => expect(api.listarContratosMaestro).toHaveBeenCalled())
    expect(screen.queryByRole('heading', { name: 'Atenciones recientes' })).toBeNull()
  })
})
