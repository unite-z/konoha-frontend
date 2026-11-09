// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MapaVectorialLocal from './MapaVectorialLocal'
import type { AreasVerdesGeoJSON } from '@/services/api/mapaInventario'

const datos: AreasVerdesGeoJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { mapa_id: 'poligono-1', Uso: 'Recreación', Nombre: 'Parque', 'Área': 100 },
      geometry: { type: 'MultiPolygon', coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]] },
    },
    {
      type: 'Feature',
      properties: { mapa_id: 'poligono-2', Uso: 'Deporte', Nombre: 'Cancha', 'Área': 200 },
      geometry: { type: 'MultiPolygon', coordinates: [[[[2, 0], [3, 0], [3, 1], [2, 1], [2, 0]]]] },
    },
  ],
}

const usos = [
  { nombre: 'Recreación', color: '#008000' },
  { nombre: 'Deporte', color: '#0000ff' },
]

afterEach(cleanup)

describe('MapaVectorialLocal', () => {
  it('filtra los polígonos por su uso original', () => {
    const props = {
      datos,
      usos,
      usoSeleccionado: '',
      onSeleccionar: vi.fn(),
    }
    const { container, rerender } = render(<MapaVectorialLocal {...props} />)
    expect(screen.getByRole('img', { name: '2 polígonos visibles' })).toBeTruthy()
    expect(container.querySelectorAll('svg path[class]')).toHaveLength(2)

    rerender(<MapaVectorialLocal {...props} usoSeleccionado="Recreación" />)
    expect(screen.getByRole('img', { name: '1 polígonos visibles' })).toBeTruthy()
    expect(container.querySelectorAll('svg path[class]')).toHaveLength(1)
  })

  it('convierte el punto pulsado a coordenadas geográficas', () => {
    const elegir = vi.fn()
    render(<MapaVectorialLocal datos={datos} usos={usos} usoSeleccionado="" onElegirPunto={elegir} />)
    const svg = screen.getByRole('img', { name: '2 polígonos visibles' })
    Object.defineProperties(svg, {
      getScreenCTM: { value: () => ({ inverse: () => ({}) }) },
      createSVGPoint: {
        value: () => ({ x: 0, y: 0, matrixTransform() { return { x: this.x, y: this.y } } }),
      },
    })
    fireEvent.click(svg, { clientX: 500, clientY: 350 })
    expect(elegir).toHaveBeenCalledWith(0.5, 1.5)
  })

  it('deja pasar la rueda normal y hace zoom gradual hacia el puntero con Ctrl o Meta', () => {
    render(<MapaVectorialLocal datos={datos} usos={usos} usoSeleccionado="" />)
    const svg = screen.getByRole('img', { name: '2 polígonos visibles' })
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 1000, 700))

    expect(fireEvent.wheel(svg, { deltaY: -100 })).toBe(true)
    expect(svg.getAttribute('viewBox')).toBe('0 0 1000 700')

    const gesto = { clientX: 750, clientY: 350, cancelable: true }
    expect(fireEvent.wheel(svg, { ...gesto, deltaY: -10, ctrlKey: true })).toBe(false)
    const [x, , ancho] = (svg.getAttribute('viewBox') ?? '').split(' ').map(Number)
    expect(ancho).toBeLessThan(1000)
    expect(ancho).toBeGreaterThan(975)
    expect(x + 0.75 * ancho).toBeCloseTo(750)

    fireEvent.wheel(svg, { ...gesto, deltaY: 10, metaKey: true })
    const [, , anchoFinal] = (svg.getAttribute('viewBox') ?? '').split(' ').map(Number)
    expect(anchoFinal).toBeCloseTo(1000)
  })
})
