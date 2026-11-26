// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import type { DatosCampus } from '@/types/campus3d'
import type { IncidenciaResumen } from '@/types/incidencias'
import { ContextoMapa } from '../base/MapaCampus/contexto'
import { mapaFalso } from '../base/MapaCampus/escenaFalsa'
import { rutaIncidencias, rutaIncidencia } from './enlaces'
import { rutasIncidencias } from './rutas'

const permisosSesion = vi.hoisted(() => ({ valor: [] as string[] | null }))
vi.mock('@/sesion/ContextoSesion', () => ({ usePermisos: () => permisosSesion.valor }))

const api = vi.hoisted(() => ({
  listarIncidencias: vi.fn(),
  listarCapatacesDisponibles: vi.fn(),
  reasignarIncidencia: vi.fn(),
  anotarCausaRetraso: vi.fn(),
  listarPoligonosMapa: vi.fn(),
}))
vi.mock('@/services/api/incidencias', () => ({
  listarIncidencias: api.listarIncidencias,
  listarCapatacesDisponibles: api.listarCapatacesDisponibles,
  reasignarIncidencia: api.reasignarIncidencia,
  anotarCausaRetraso: api.anotarCausaRetraso,
}))
vi.mock('@/services/api/mapaAsignaciones', () => ({ listarPoligonosMapa: api.listarPoligonosMapa }))

const CONSULTAR = 'PLA.PLANIFICACION.CONSULTAR'
const TODAS = 'PLA.INCIDENCIA.CONSULTAR_TODAS'
const GESTIONAR = 'PLA.INCIDENCIA.CLASIFICAR'

const datosCampus = {
  proyeccion: { tipo: 'equirrectangular-local', origen_lon: 0, origen_lat: 0, kx: 100000, ky: 100000, unidad: 'm' },
  areas: [
    { id: 'm-1', n: 'Jardín', c: null, s: 100, r: '', p: [0, 0, 10, 0, 10, 10, 0, 10], ct: [5, 5] },
    { id: 'm-2', n: 'Patio', c: null, s: 100, r: '', p: [100, 0, 110, 0, 110, 10, 100, 10], ct: [105, 5] },
  ],
} as unknown as DatosCampus

const hace = (horas: number) => new Date(Date.now() - horas * 3_600_000).toISOString()

function incidencia(id: number, extra: Partial<IncidenciaResumen> = {}): IncidenciaResumen {
  return {
    id,
    codigo: `INC-00${id}`,
    tipo: 'Hojarasca en exceso',
    tipo_sencilla: true,
    espacio: 'Patio de Letras',
    severidad: null,
    via: 'PersonalPropio',
    estado: 'Registrada',
    canal: 'App',
    fecha_registro: hace(2),
    fecha_cierre: null,
    responsable: 'Luis P.',
    area_verde_id: 11,
    ...extra,
  }
}

function montar(entrada: string, conMapa = true) {
  const enrutador = createMemoryRouter([{ path: '/n', children: rutasIncidencias }], { initialEntries: [entrada] })
  const mapa = mapaFalso(datosCampus)
  render(
    <ContextoMapa value={conMapa ? mapa : null}>
      <RouterProvider router={enrutador} />
    </ContextoMapa>,
  )
  return { enrutador, mapa }
}

// jsdom no implementa showModal ni close de <dialog>.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})

beforeEach(() => {
  permisosSesion.valor = [CONSULTAR, TODAS]
  api.listarIncidencias.mockResolvedValue([
    incidencia(1),
    incidencia(2, { estado: 'EnAtencion', area_verde_id: 12, fecha_registro: hace(30) }),
    incidencia(3, { estado: 'Cerrada', fecha_cierre: hace(1), area_verde_id: null }),
  ])
  api.listarPoligonosMapa.mockResolvedValue([
    { id_fuente: 'm-1', area_verde_id: 11 },
    { id_fuente: 'm-2', area_verde_id: 12 },
  ])
  api.listarCapatacesDisponibles.mockResolvedValue([{ id: 9, nombre: 'Ana R.', cuadrilla: 'Norte' }])
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Incidencias · bandeja, plazos y mapa (RD-42)', () => {
  it('sin el permiso de planificación muestra «sin acceso» y no consulta', () => {
    permisosSesion.valor = []
    montar(rutaIncidencias())
    expect(screen.getByText('No puedes ver las incidencias')).toBeTruthy()
    expect(api.listarIncidencias).not.toHaveBeenCalled()
  })

  it('con CONSULTAR_TODAS enseña lo que devuelve el servidor, con contadores por grupo', async () => {
    montar(rutaIncidencias())
    const lista = await screen.findByRole('list', { name: 'Incidencias' })
    expect(within(lista).getAllByRole('button')).toHaveLength(3)
    expect(screen.getByRole('heading', { name: 'Incidencias' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: /Todas/ }).textContent).toContain('3')
    expect(screen.getByRole('tab', { name: /Abiertas/ }).textContent).toContain('1')
    expect(screen.getByRole('tab', { name: /En proceso/ }).textContent).toContain('1')
    expect(screen.getByRole('tab', { name: /Cerradas/ }).textContent).toContain('1')
  })

  it('sin CONSULTAR_TODAS (capataz) muestra el título de su cuadrilla y no filtra en el cliente', async () => {
    permisosSesion.valor = [CONSULTAR]
    api.listarIncidencias.mockResolvedValue([incidencia(1)])
    montar(rutaIncidencias())
    expect(await screen.findByRole('heading', { name: 'Incidencias de mi cuadrilla' })).toBeTruthy()
    expect(within(await screen.findByRole('list', { name: 'Incidencias' })).getAllByRole('button')).toHaveLength(1)
    // Sin el permiso de gestión no hay cabecera «Plazos».
    expect(screen.queryByRole('heading', { name: 'Plazos' })).toBeNull()
  })

  it('el grupo y la búsqueda viven en la URL', async () => {
    const { enrutador } = montar(rutaIncidencias({ grupo: 'cerradas', q: 'hoja' }))
    const lista = await screen.findByRole('list', { name: 'Incidencias' })
    expect(within(lista).getAllByRole('button')).toHaveLength(1)
    expect(api.listarIncidencias).toHaveBeenCalledWith(expect.anything(), 'hoja')
    await userEvent.click(screen.getByRole('tab', { name: /Abiertas/ }))
    await waitFor(() => expect(enrutador.state.location.search).toBe('?grupo=abiertas&q=hoja'))
  })

  it('el aviso de 24 h aparece en la fila que lo cumple', async () => {
    montar(rutaIncidencias())
    const lista = await screen.findByRole('list', { name: 'Incidencias' })
    expect(within(lista).getAllByText(/Más de 24 h abierta/)).toHaveLength(1)
  })

  it('elegir una fila la marca, la pone en la URL y deja un marcador por incidencia con área', async () => {
    const { enrutador, mapa } = montar(rutaIncidencias())
    const lista = await screen.findByRole('list', { name: 'Incidencias' })
    // La tercera no tiene área: dos marcadores.
    await screen.findByRole('button', { name: /INC-001 · Hojarasca/ })
    expect(screen.getByRole('button', { name: /INC-002 · Hojarasca/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /INC-003 · Hojarasca/ })).toBeNull()
    expect(mapa.anclajes).toHaveLength(2)

    await userEvent.click(within(lista).getAllByRole('button')[1])
    await waitFor(() => expect(enrutador.state.location.search).toBe('?incidencia=2'))
    expect(within(lista).getAllByRole('button')[1].getAttribute('aria-pressed')).toBe('true')
    expect(within(lista).getAllByRole('button')[0].getAttribute('aria-pressed')).toBe('false')
  })

  it('elegir un marcador selecciona su fila', async () => {
    const { enrutador } = montar(rutaIncidencias())
    const lista = await screen.findByRole('list', { name: 'Incidencias' })
    await userEvent.click(await screen.findByRole('button', { name: /INC-002 · Hojarasca/ }))
    await waitFor(() => expect(enrutador.state.location.search).toBe('?incidencia=2'))
    expect(within(lista).getAllByRole('button')[1].getAttribute('aria-pressed')).toBe('true')
  })

  it('una incidencia seleccionada en la URL llega marcada y pinta su área', async () => {
    const { mapa } = montar(rutaIncidencia(1))
    const lista = await screen.findByRole('list', { name: 'Incidencias' })
    expect(within(lista).getAllByRole('button')[0].getAttribute('aria-pressed')).toBe('true')
    await waitFor(() => expect(mapa.escena.pintarAreas).toHaveBeenCalledWith([{ token: '--color-info', indices: [0] }]))
  })

  it('sin área verde en las incidencias (sin RD-84) no hay marcadores y la bandeja funciona', async () => {
    api.listarIncidencias.mockResolvedValue([incidencia(1, { area_verde_id: undefined })])
    const { mapa } = montar(rutaIncidencias())
    expect(await screen.findByRole('list', { name: 'Incidencias' })).toBeTruthy()
    expect(mapa.anclajes).toHaveLength(0)
  })

  it('sin permiso para los polígonos tampoco hay marcadores ni fallo', async () => {
    api.listarPoligonosMapa.mockRejectedValue(new ErrorApi(403, null, 'Prohibido'))
    const { mapa } = montar(rutaIncidencias())
    expect(await screen.findByRole('list', { name: 'Incidencias' })).toBeTruthy()
    expect(mapa.anclajes).toHaveLength(0)
  })

  it('quien gestiona ve «Plazos» con los tres avisos y «Reasignar» y «Anotar causa»', async () => {
    permisosSesion.valor = [CONSULTAR, TODAS, GESTIONAR]
    api.listarIncidencias.mockResolvedValue([
      incidencia(1),
      incidencia(2, { fecha_registro: hace(30) }),
      incidencia(4, { fecha_registro: hace(50) }),
    ])
    api.reasignarIncidencia.mockResolvedValue(incidencia(2, { responsable: 'Ana R.' }))
    montar(rutaIncidencias())
    expect(await screen.findByRole('heading', { name: 'Plazos' })).toBeTruthy()
    const avisos = screen.getByRole('list', { name: 'Avisos de plazo' })
    expect(within(avisos).getAllByRole('listitem')).toHaveLength(3)
    expect(within(avisos).getByText(/Supera el objetivo · 24 h: 1/)).toBeTruthy()
    expect(within(avisos).getByText(/Vencida · 48 h: 1/)).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Anotar causa' })).toHaveLength(2)

    await userEvent.click(screen.getAllByRole('button', { name: 'Reasignar' })[0])
    await userEvent.selectOptions(await screen.findByLabelText(/Capataz/), '9')
    const ventana = screen.getByRole('dialog', { name: /Reasignar · / })
    await userEvent.click(within(ventana).getByRole('button', { name: 'Reasignar' }))
    await waitFor(() => expect(api.reasignarIncidencia).toHaveBeenCalledWith(expect.any(Number), 9))
    expect(await screen.findByText(/reasignada a Ana R\./)).toBeTruthy()
  })

  it('anotar la causa exige texto y la envía', async () => {
    permisosSesion.valor = [CONSULTAR, TODAS, GESTIONAR]
    api.listarIncidencias.mockResolvedValue([incidencia(2, { fecha_registro: hace(30) })])
    api.anotarCausaRetraso.mockResolvedValue(undefined)
    montar(rutaIncidencias())
    await userEvent.click(await screen.findByRole('button', { name: 'Anotar causa' }))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar causa', hidden: true }))
    expect(api.anotarCausaRetraso).not.toHaveBeenCalled()
    await userEvent.type(screen.getByLabelText(/Causa/), 'Falta de personal')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar causa', hidden: true }))
    await waitFor(() => expect(api.anotarCausaRetraso).toHaveBeenCalledWith(2, 'Falta de personal'))
  })

  it('sin incidencias muestra el vacío', async () => {
    api.listarIncidencias.mockResolvedValue([])
    montar(rutaIncidencias())
    expect(await screen.findByText('Sin incidencias en esta pestaña')).toBeTruthy()
  })

  it('un error del servidor muestra el aviso con «Reintentar»', async () => {
    api.listarIncidencias.mockRejectedValue(new ErrorApi(500, null, 'Fallo del servidor'))
    montar(rutaIncidencias())
    expect(await screen.findByText('No pudimos cargar las incidencias')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeTruthy()
  })

  it('un 403 del servidor muestra «sin acceso»', async () => {
    api.listarIncidencias.mockRejectedValue(new ErrorApi(403, null, 'Prohibido'))
    montar(rutaIncidencias())
    expect(await screen.findByText('No puedes ver las incidencias')).toBeTruthy()
  })
})
