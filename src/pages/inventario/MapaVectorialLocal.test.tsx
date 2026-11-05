// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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

describe('MapaVectorialLocal', () => {
  it('filtra los polígonos por su uso original', () => {
    const props = {
      datos,
      usos,
      categorias: [],
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
})
