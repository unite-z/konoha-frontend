// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AreasVerdesGeoJSON } from '@/services/api/mapaInventario'
import type { DatosCampus } from '@/types/campus3d'
import CapaColores from './CapaColores'
import CapaGeometrias from './CapaGeometrias'
import CapaMarcadores from './CapaMarcadores'
import { ContextoMapa } from './contexto'
import { mapaFalso } from './escenaFalsa'
import { reiniciarCacheGeometrias } from './geometrias'
import type { MarcadorMapa } from './marcadores'

const cargar = vi.fn()
vi.mock('@/services/api/mapaInventario', () => ({ cargarAreasVerdesGeoJSON: () => cargar() }))

const datos = {
  proyeccion: { tipo: 'equirrectangular-local', origen_lon: 0, origen_lat: 0, kx: 100000, ky: 100000, unidad: 'm' },
  areas: [
    { id: 'a', n: 'Arboleda', c: null, s: 100, r: '', p: [0, 0, 10, 0, 10, 10, 0, 10], ct: [5, 5] },
    { id: 'b', n: 'Bosque', c: null, s: 100, r: '', p: [100, 0, 110, 0, 110, 10, 100, 10], ct: [105, 5] },
  ],
} as unknown as DatosCampus

const conMapa = (mapa: ReturnType<typeof mapaFalso> | null, hijos: ReactNode) => (
  <ContextoMapa value={mapa}>{hijos}</ContextoMapa>
)

beforeEach(() => reiniciarCacheGeometrias())
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('CapaColores (AV-426)', () => {
  it('colorea por clase con el token de cada clase y quita la capa al desmontarse', () => {
    const mapa = mapaFalso(datos)
    const clases = { a: 'cortada', b: 'pendiente' }
    const colores = { cortada: '--color-success', pendiente: '--color-warning' }
    const { unmount } = render(conMapa(mapa, <CapaColores clases={clases} colores={colores} />))
    expect(mapa.escena.pintarAreas).toHaveBeenCalledWith([
      { token: '--color-success', indices: [0] },
      { token: '--color-warning', indices: [1] },
    ])
    unmount()
    expect(mapa.quitarCapa).toHaveBeenCalled()
  })

  it('sin mapa listo no hace nada', () => {
    expect(() =>
      render(conMapa(null, <CapaColores clases={{ a: 'x' }} colores={{ x: '--color-info' }} />)),
    ).not.toThrow()
  })
})

describe('CapaMarcadores (AV-426)', () => {
  const marcadores: MarcadorMapa[] = [
    { id: 'm1', etiqueta: 'Incidencia 1', areaId: 'a', tono: 'error' },
    { id: 'm2', etiqueta: 'Incidencia 2', areaId: 'b' },
  ]

  it('pinta un botón por marcador y se activa con teclado', async () => {
    const mapa = mapaFalso(datos)
    const alActivar = vi.fn()
    render(conMapa(mapa, <CapaMarcadores marcadores={marcadores} onActivar={alActivar} />))
    const boton = await screen.findByRole('button', { name: 'Incidencia 1' })
    expect(await screen.findByRole('button', { name: 'Incidencia 2' })).toBeTruthy()
    expect(mapa.anclajes.map((a) => [a.x, a.y])).toEqual([
      [5, 5],
      [105, 5],
    ])
    boton.focus()
    await userEvent.keyboard('{Enter}')
    expect(alActivar).toHaveBeenCalledWith(marcadores[0])
  })

  it('agrupa los que se solapan y al activar el grupo acerca el mapa', async () => {
    const mapa = mapaFalso(datos)
    mapa.escena.metrosPorPixel.mockReturnValue(10) // a esta escala 28 px son 280 m: los dos se solapan
    render(conMapa(mapa, <CapaMarcadores marcadores={marcadores} onActivar={vi.fn()} />))
    const grupo = await screen.findByRole('button', { name: /2 marcadores en esta zona/ })
    expect(screen.queryByRole('button', { name: 'Incidencia 1' })).toBeNull()
    grupo.focus()
    await userEvent.keyboard(' ')
    expect(mapa.escena.enfocar).toHaveBeenCalledWith(55, 5, 2.4)
  })

  it('un grupo que el zoom no separa (misma área) se despliega en sus botones y Escape lo pliega', async () => {
    const mapa = mapaFalso(datos)
    const alActivar = vi.fn()
    const mismaArea: MarcadorMapa[] = [
      { id: 'm1', etiqueta: 'Incidencia 1', areaId: 'a' },
      { id: 'm2', etiqueta: 'Incidencia 2', areaId: 'a' },
    ]
    render(conMapa(mapa, <CapaMarcadores marcadores={mismaArea} onActivar={alActivar} />))
    const grupo = await screen.findByRole('button', { name: /2 marcadores en esta zona/ })
    expect(grupo.getAttribute('aria-expanded')).toBe('false')
    grupo.focus()
    await userEvent.keyboard('{Enter}')
    expect(mapa.escena.enfocar).not.toHaveBeenCalled()
    const primero = await screen.findByRole('button', { name: 'Incidencia 1' })
    expect(document.activeElement).toBe(primero)
    await userEvent.keyboard('{Tab}{Enter}')
    expect(alActivar).toHaveBeenCalledWith(mismaArea[1])
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(document.activeElement?.getAttribute('aria-label')).toMatch(/2 marcadores/))
  })

  it('al acercar el zoom los marcadores se separan', async () => {
    const mapa = mapaFalso(datos)
    mapa.escena.metrosPorPixel.mockReturnValue(10)
    render(conMapa(mapa, <CapaMarcadores marcadores={marcadores} onActivar={vi.fn()} />))
    await screen.findByRole('button', { name: /2 marcadores/ })
    mapa.escena.metrosPorPixel.mockReturnValue(0.5)
    act(() => mapa.oyentes.forEach((oyente) => oyente()))
    expect(await screen.findByRole('button', { name: 'Incidencia 2' })).toBeTruthy()
  })

  it('retira los marcadores al desmontarse y sin lista no pinta nada', async () => {
    const mapa = mapaFalso(datos)
    const { unmount } = render(conMapa(mapa, <CapaMarcadores marcadores={marcadores} onActivar={vi.fn()} />))
    await screen.findByRole('button', { name: 'Incidencia 1' })
    unmount()
    expect(screen.queryByRole('button', { name: 'Incidencia 1' })).toBeNull()
    cleanup()
    render(conMapa(mapa, <CapaMarcadores marcadores={[]} onActivar={vi.fn()} />))
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})

describe('CapaGeometrias (AV-426)', () => {
  const lado = 20
  const anillo = [
    [300, 0],
    [300 + lado, 0],
    [300 + lado, lado],
    [300, lado],
    [300, 0],
  ].map(([x, y]) => [x / 100000, y / 100000])
  const geojson = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { mapa_id: 'nueva', Nombre: 'Jardín nuevo' },
        geometry: { type: 'MultiPolygon', coordinates: [[anillo]] },
      },
    ],
  } as unknown as AreasVerdesGeoJSON

  it('dibuja la geometría nueva, hace una sola petición y deja seleccionarla', async () => {
    cargar.mockResolvedValue(geojson)
    const mapa = mapaFalso(datos)
    const alSeleccionar = vi.fn()
    const alEstado = vi.fn()
    render(conMapa(mapa, <CapaGeometrias onSeleccionarArea={alSeleccionar} onEstado={alEstado} />))
    await waitFor(() => expect(mapa.escena.dibujarGeometrias).toHaveBeenCalledTimes(1))
    expect(cargar).toHaveBeenCalledTimes(1)
    expect(alEstado).toHaveBeenLastCalledWith(
      'listo',
      expect.arrayContaining([expect.objectContaining({ id: 'nueva' })]),
    )
    const alPulsar = (mapa.escena.dibujarGeometrias.mock.calls[0] as unknown as [unknown, (id: string) => void])[1]
    alPulsar('nueva')
    expect(alSeleccionar).toHaveBeenCalledWith(expect.objectContaining({ id: 'nueva', n: 'Jardín nuevo' }))
  })

  it('oculta la versión antigua de un área cambiada y la restituye al desmontarse', async () => {
    const cambiada = {
      ...geojson,
      features: [{ ...geojson.features[0], properties: { mapa_id: 'a' } }],
    } as unknown as AreasVerdesGeoJSON
    cargar.mockResolvedValue(cambiada)
    const mapa = mapaFalso(datos)
    const { unmount } = render(conMapa(mapa, <CapaGeometrias />))
    await waitFor(() => expect(mapa.escena.ocultarAreas).toHaveBeenCalledWith([0]))
    unmount()
    expect(mapa.restituir).toHaveBeenCalled()
    expect(mapa.quitarGeometrias).toHaveBeenCalled()
  })

  it('si el endpoint falla avisa y no dibuja nada', async () => {
    cargar.mockRejectedValue(new Error('404'))
    const mapa = mapaFalso(datos)
    const alEstado = vi.fn()
    render(conMapa(mapa, <CapaGeometrias onEstado={alEstado} />))
    await waitFor(() => expect(alEstado).toHaveBeenLastCalledWith('error', []))
    expect(mapa.escena.dibujarGeometrias).not.toHaveBeenCalled()
  })

  it('no pide nada hasta que el mapa está listo', () => {
    render(conMapa(null, <CapaGeometrias />))
    expect(cargar).not.toHaveBeenCalled()
  })
})
