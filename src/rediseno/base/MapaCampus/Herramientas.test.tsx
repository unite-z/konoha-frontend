// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DatosCampus } from '@/types/campus3d'
import type { useUbicacionEnMapa } from '@/pages/inventario/useUbicacionEnMapa'
import { ContextoMapa } from './contexto'
import { mapaFalso } from './escenaFalsa'
import HerramientaContorno from './HerramientaContorno'
import HerramientaPunto from './HerramientaPunto'

const datos = {
  proyeccion: { tipo: 'equirrectangular-local', origen_lon: 0, origen_lat: 0, kx: 100000, ky: 100000, unidad: 'm' },
  areas: [],
} as unknown as DatosCampus

afterEach(cleanup)

const tocar = (mapa: ReturnType<typeof mapaFalso>, x: number, y: number) =>
  act(() => {
    for (const oyente of mapa.oyentesSuelo) oyente({ x, y })
  })

type Ubicacion = ReturnType<typeof useUbicacionEnMapa>
const validacion = (parcial: Partial<Ubicacion>): Ubicacion => ({
  area: '',
  detectada: undefined,
  candidatas: [],
  ambiguo: false,
  fuera: false,
  cargando: false,
  error: false,
  pendiente: false,
  ...parcial,
})

describe('HerramientaPunto (AV-428)', () => {
  it('devuelve lon/lat del punto tocado y marca el centro con el botón', async () => {
    const mapa = mapaFalso(datos)
    const onElegir = vi.fn()
    render(
      <ContextoMapa value={mapa}>
        <HerramientaPunto punto={null} onElegir={onElegir} />
      </ContextoMapa>,
    )
    tocar(mapa, 100, 50)
    expect(onElegir).toHaveBeenLastCalledWith({ lon: 0.001, lat: 0.0005 })
    mapa.escena.centro.mockReturnValue({ x: 200, y: 0 })
    await userEvent.click(screen.getByRole('button', { name: 'Marcar el centro del mapa' }))
    expect(onElegir).toHaveBeenLastCalledWith({ lon: 0.002, lat: 0 })
  })

  it('enseña los tres avisos según la validación', () => {
    const mapa = mapaFalso(datos)
    const punto = { lon: 0.001, lat: 0.001 }
    const pintar = (v: Ubicacion) =>
      render(
        <ContextoMapa value={mapa}>
          <HerramientaPunto punto={punto} onElegir={vi.fn()} validacion={v} />
        </ContextoMapa>,
      )
    pintar(validacion({ fuera: true }))
    expect(screen.getByText(/El punto está fuera del área seleccionada/)).toBeTruthy()
    cleanup()
    pintar(validacion({ detectada: { id: 3, nombre: 'Jardín Norte' } as Ubicacion['detectada'] }))
    expect(screen.getByText(/Área detectada · Jardín Norte/)).toBeTruthy()
    cleanup()
    pintar(
      validacion({
        candidatas: [
          { id: 1, nombre: 'A' },
          { id: 2, nombre: 'B' },
        ] as Ubicacion['candidatas'],
      }),
    )
    expect(screen.getByText(/Hay varias áreas en este punto/)).toBeTruthy()
  })

  it('mueve el punto con las flechas, lo quita y retira el toque al desmontarse', async () => {
    const mapa = mapaFalso(datos)
    const onElegir = vi.fn()
    const { unmount } = render(
      <ContextoMapa value={mapa}>
        <HerramientaPunto punto={{ lon: 0, lat: 0 }} onElegir={onElegir} />
      </ContextoMapa>,
    )
    const marca = screen.getByRole('button', { name: /Punto elegido\. Flechas/ })
    marca.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(onElegir).toHaveBeenLastCalledWith({ lon: 0.00001, lat: 0 })
    await userEvent.keyboard('{Delete}')
    expect(onElegir).toHaveBeenLastCalledWith(null)
    unmount()
    expect(mapa.oyentesSuelo.size).toBe(0)
  })

  it('sin mapa listo no falla y deshabilita el botón del centro', () => {
    render(<HerramientaPunto punto={null} onElegir={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Marcar el centro del mapa' }).getAttribute('aria-disabled')).toBe('true')
  })
})

describe('HerramientaContorno (AV-428)', () => {
  const montar = () => {
    const mapa = mapaFalso(datos)
    const onCerrar = vi.fn()
    render(
      <ContextoMapa value={mapa}>
        <HerramientaContorno onCerrar={onCerrar} />
      </ContextoMapa>,
    )
    return { mapa, onCerrar }
  }
  const cerrarBoton = () => screen.getByRole('button', { name: 'Cerrar contorno' })

  it('lleva la cámara a planta y dibuja vértices, trazo y superficie', () => {
    const { mapa } = montar()
    expect(mapa.escena.irAVista).toHaveBeenCalledWith('planta')
    tocar(mapa, 0, 0)
    tocar(mapa, 10, 0)
    tocar(mapa, 10, 10)
    expect(screen.getAllByRole('button', { name: /^Vértice/ })).toHaveLength(3)
    expect(screen.getByText(/3 vértices · Superficie aproximada: 50 m²/)).toBeTruthy()
    expect(mapa.escena.dibujarTrazo).toHaveBeenLastCalledWith([0, 0, 10, 0, 10, 10], false, expect.any(String))
  })

  it('cierra y devuelve GeoJSON con la superficie', async () => {
    const { mapa, onCerrar } = montar()
    expect(cerrarBoton().getAttribute('aria-disabled')).toBe('true')
    for (const [x, y] of [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ])
      tocar(mapa, x, y)
    await userEvent.click(cerrarBoton())
    const resultado = onCerrar.mock.calls[0][0]
    expect(resultado.superficie_m2).toBe(100)
    expect(resultado.geojson.coordinates[0]).toHaveLength(5)
    expect(resultado.geojson.coordinates[0][1]).toEqual([0.0001, 0])
  })

  it('deshace la última acción, también el cierre', async () => {
    const { mapa } = montar()
    for (const [x, y] of [
      [0, 0],
      [10, 0],
      [10, 10],
    ])
      tocar(mapa, x, y)
    await userEvent.click(cerrarBoton())
    expect(screen.getByText(/Contorno cerrado/)).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Deshacer' }))
    expect(screen.queryByText(/Contorno cerrado/)).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Deshacer' }))
    expect(screen.getAllByRole('button', { name: /^Vértice/ })).toHaveLength(2)
  })

  it('mueve un vértice con las flechas y por arrastre', async () => {
    const { mapa } = montar()
    tocar(mapa, 0, 0)
    tocar(mapa, 10, 0)
    tocar(mapa, 10, 10)
    const segundo = screen.getByRole('button', { name: /^Vértice 2 de 3/ })
    segundo.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(mapa.escena.dibujarTrazo).toHaveBeenLastCalledWith([0, 0, 11, 0, 10, 10], false, expect.any(String))
    mapa.escena.suelo.mockReturnValue({ x: 20, y: -5 })
    fireEvent.pointerDown(segundo, { pointerId: 1 })
    fireEvent.pointerMove(segundo, { pointerId: 1, clientX: 20, clientY: 5 })
    fireEvent.pointerUp(segundo, { pointerId: 1 })
    expect(mapa.escena.dibujarTrazo).toHaveBeenLastCalledWith([0, 0, 20, -5, 10, 10], false, expect.any(String))
    // Un arrastre entero se deshace de una vez.
    await userEvent.click(screen.getByRole('button', { name: 'Deshacer' }))
    expect(mapa.escena.dibujarTrazo).toHaveBeenLastCalledWith([0, 0, 11, 0, 10, 10], false, expect.any(String))
  })

  it('rechaza vértices, movimientos y cierres que cruzan el contorno', async () => {
    const { mapa, onCerrar } = montar()
    for (const [x, y] of [
      [0, 0],
      [10, 10],
      [10, 0],
    ])
      tocar(mapa, x, y)
    tocar(mapa, 0, 10) // el lado (10,0)-(0,10) corta (0,0)-(10,10)
    expect(screen.getByText(/se cruzaría consigo mismo/)).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /^Vértice/ })).toHaveLength(3)
    expect(onCerrar).not.toHaveBeenCalled()
  })

  it('rechaza mover un vértice si el contorno se cruza', async () => {
    const { mapa } = montar()
    for (const [x, y] of [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ])
      tocar(mapa, x, y)
    const cuarto = screen.getByRole('button', { name: /^Vértice 4 de 4/ })
    mapa.escena.suelo.mockReturnValue({ x: 5, y: -5 })
    fireEvent.pointerDown(cuarto, { pointerId: 1 })
    fireEvent.pointerMove(cuarto, { pointerId: 1, clientX: 1, clientY: 1 })
    expect(screen.getByText(/se cruzaría consigo mismo/)).toBeTruthy()
    expect(mapa.escena.dibujarTrazo).toHaveBeenLastCalledWith([0, 0, 10, 0, 10, 10, 0, 10], false, expect.any(String))
  })

  it('añade un vértice en el centro con el teclado y quita las capas al desmontarse', async () => {
    const mapa = mapaFalso(datos)
    mapa.escena.centro.mockReturnValue({ x: 5, y: 6 })
    const { unmount } = render(
      <ContextoMapa value={mapa}>
        <HerramientaContorno onCerrar={vi.fn()} />
      </ContextoMapa>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Añadir vértice en el centro' }))
    await mapa.escena.centro.mock.results[0]
    expect(screen.getByRole('button', { name: /^Vértice 1 de 1/ })).toBeTruthy()
    unmount()
    expect(mapa.oyentesSuelo.size).toBe(0)
  })

  it('arranca cerrado con un contorno inicial', () => {
    const mapa = mapaFalso(datos)
    const inicial = {
      type: 'Polygon' as const,
      coordinates: [
        [
          [0, 0],
          [0.0001, 0],
          [0.0001, 0.0001],
          [0, 0],
        ],
      ],
    }
    render(
      <ContextoMapa value={mapa}>
        <HerramientaContorno onCerrar={vi.fn()} inicial={inicial} />
      </ContextoMapa>,
    )
    expect(screen.getByText(/Contorno cerrado/)).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /^Vértice/ })).toHaveLength(3)
  })
})
