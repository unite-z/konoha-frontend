// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MapaVectorialLocal from './MapaVectorialLocal'
import type { AreasVerdesGeoJSON } from '@/services/api/mapaInventario'

const datos: AreasVerdesGeoJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { mapa_id: 'poligono-1', Uso: 'Ornamental', Nombre: 'Parque', 'Área': 100, clasificacion_mapa_id: 'tipo:7', clasificacion_mapa_nombre: 'Ornamental', inventario_nombre: 'Jardín ficha', inventario_superficie_m2: '125.50' },
      geometry: { type: 'MultiPolygon', coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]] },
    },
    {
      type: 'Feature',
      properties: { mapa_id: 'poligono-2', Uso: 'Deporte', Nombre: 'Cancha', 'Área': 200, clasificacion_mapa_id: 'tipo:8' },
      geometry: { type: 'MultiPolygon', coordinates: [[[[2, 0], [3, 0], [3, 1], [2, 1], [2, 0]]]] },
    },
  ],
}

const usos = [
  { id: 'tipo:7', nombre: 'Recreativo', color: '#008000' },
  { id: 'tipo:8', nombre: 'Deportivo', color: '#0000ff' },
]

describe('MapaVectorialLocal', () => {
  afterEach(cleanup)

  it('filtra los polígonos por su clasificación efectiva', () => {
    const props = {
      datos,
      usos,
      usoSeleccionado: '',
      idPoligonoSeleccionado: null,
      idPoligonoCentrar: null,
      onSeleccionar: vi.fn(),
    }
    const { container, rerender } = render(<MapaVectorialLocal {...props} />)
    expect(screen.getByRole('img', { name: '2 polígonos visibles' })).toBeTruthy()
    expect(container.querySelectorAll('svg path[class]')).toHaveLength(2)

    rerender(<MapaVectorialLocal {...props} usoSeleccionado="tipo:7" />)
    expect(screen.getByRole('img', { name: '1 polígonos visibles' })).toBeTruthy()
    expect(container.querySelectorAll('svg path[class]')).toHaveLength(1)
  })

  it('entrega al seleccionar los datos vigentes de la ficha vinculada', () => {
    const onSeleccionar = vi.fn()
    const { container } = render(<MapaVectorialLocal datos={datos} usos={usos} usoSeleccionado="" idPoligonoSeleccionado={null} idPoligonoCentrar={null} onSeleccionar={onSeleccionar} />)
    const poligono = container.querySelector('svg path[class]')
    if (!poligono) throw new Error('No se encontró el polígono del mapa.')

    fireEvent.click(poligono)

    expect(onSeleccionar).toHaveBeenCalledWith(expect.objectContaining({
      properties: expect.objectContaining({
        inventario_nombre: 'Jardín ficha',
        inventario_superficie_m2: '125.50',
        clasificacion_mapa_nombre: 'Ornamental',
      }),
    }))
  })

  it('separa el realce temporal del cursor del borde persistente de selección', () => {
    const onSeleccionar = vi.fn()
    const { container, rerender } = render(
      <MapaVectorialLocal datos={datos} usos={usos} usoSeleccionado="" idPoligonoSeleccionado={null} idPoligonoCentrar={null} onSeleccionar={onSeleccionar} />,
    )
    const svg = container.querySelector('svg')
    const poligonos = container.querySelectorAll('svg path[class]')
    const primero = poligonos[0]
    const segundo = poligonos[1]
    if (!svg || !primero || !segundo) throw new Error('No se encontraron los polígonos del mapa.')

    fireEvent.mouseEnter(primero)
    expect(primero.getAttribute('stroke')).toBe('#008000')
    expect(primero.getAttribute('stroke-width')).toBe('2')
    fireEvent.mouseLeave(primero)
    expect(primero.getAttribute('stroke-width')).toBe('1.3')

    fireEvent.click(primero)
    rerender(<MapaVectorialLocal datos={datos} usos={usos} usoSeleccionado="" idPoligonoSeleccionado="poligono-1" idPoligonoCentrar={null} onSeleccionar={onSeleccionar} />)
    fireEvent.mouseLeave(primero)
    expect(primero.getAttribute('stroke')).toBe('#008000')
    expect(primero.getAttribute('stroke-width')).toBe('3')
    expect(primero.getAttribute('stroke-dasharray')).toBe('5 2')

    fireEvent.click(segundo)
    rerender(<MapaVectorialLocal datos={datos} usos={usos} usoSeleccionado="" idPoligonoSeleccionado="poligono-2" idPoligonoCentrar={null} onSeleccionar={onSeleccionar} />)
    expect(primero.getAttribute('stroke-width')).toBe('1.3')
    expect(segundo.getAttribute('stroke')).toBe('#0000ff')
    expect(segundo.getAttribute('stroke-width')).toBe('3')
    expect(onSeleccionar).toHaveBeenCalledTimes(2)
  })

  it('centra el mapa en el polígono seleccionado por un enlace profundo', async () => {
    const { container, rerender } = render(
      <MapaVectorialLocal datos={datos} usos={usos} usoSeleccionado="" idPoligonoSeleccionado={null} idPoligonoCentrar={null} onSeleccionar={vi.fn()} />,
    )
    const svg = container.querySelector('svg')
    if (!svg) throw new Error('No se encontró el mapa.')
    const viewBoxInicial = svg.getAttribute('viewBox')

    rerender(<MapaVectorialLocal datos={datos} usos={usos} usoSeleccionado="tipo:8" idPoligonoSeleccionado="poligono-2" idPoligonoCentrar="poligono-2" onSeleccionar={vi.fn()} />)

    await waitFor(() => expect(svg.getAttribute('viewBox')).not.toBe(viewBoxInicial))
    const viewBox = svg.getAttribute('viewBox')?.split(' ').map(Number) ?? []
    expect(viewBox[2]).toBeLessThan(1000)
    expect(viewBox[0] + viewBox[2] / 2).toBeGreaterThan(500)
    expect(svg.getAttribute('aria-label')).toBe('1 polígonos visibles')
  })
})
