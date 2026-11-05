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
      properties: { mapa_id: 'poligono-1', Uso: 'Recreación', Nombre: 'Parque', 'Área': 100, clasificacion_mapa_id: 'tipo:7' },
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
  it('filtra los polígonos por su clasificación efectiva', () => {
    const props = {
      datos,
      usos,
      usoSeleccionado: '',
      onSeleccionar: vi.fn(),
    }
    const { container, rerender } = render(<MapaVectorialLocal {...props} />)
    expect(screen.getByRole('img', { name: '2 polígonos visibles' })).toBeTruthy()
    expect(container.querySelectorAll('svg path[class]')).toHaveLength(2)

    rerender(<MapaVectorialLocal {...props} usoSeleccionado="tipo:7" />)
    expect(screen.getByRole('img', { name: '1 polígonos visibles' })).toBeTruthy()
    expect(container.querySelectorAll('svg path[class]')).toHaveLength(1)
  })
})
