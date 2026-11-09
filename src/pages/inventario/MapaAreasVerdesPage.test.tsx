// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import type { AreasVerdesGeoJSON } from '@/services/api/mapaInventario'
import MapaAreasVerdesPage from './MapaAreasVerdesPage'

const { listarEjemplaresDeArea } = vi.hoisted(() => ({
  listarEjemplaresDeArea: vi.fn(async () => [
    { id: 1, codigo: 'AR-01', latitud: -12.001, longitud: -77.002, especie_nombre_comun: 'Molle' },
    { id: 2, codigo: 'AR-02', latitud: null, longitud: -77.002, especie_nombre_comun: 'Tara' },
  ]),
}))

vi.mock('@/services/api/ejemplares', () => ({ listarEjemplaresDeArea }))
vi.mock('@/services/api/mapaInventario', () => ({
  cargarAreasVerdesGeoJSON: async (): Promise<AreasVerdesGeoJSON> => ({
    type: 'FeatureCollection',
    features: [1, 2, 3].map((id) => ({
      type: 'Feature',
      properties: { mapa_id: `p-${id}`, Nombre: 'Jardín Central', Uso: id === 3 ? 'Sin catalogar' : 'Recreación', Área: id * 100 },
      geometry: {
        type: 'MultiPolygon',
        coordinates: [[[[-77.003, -12], [-77, -12], [-77, -12 - id * 0.001], [-77.003, -12]]]],
      },
    })),
  }),
}))
vi.mock('@/services/api/mapaAsignaciones', () => ({
  listarPoligonosMapa: async () => [{
    id_fuente: 'p-1', area_verde_id: 42, area_verde_nombre: 'Bosque Húmedo', superficie_registrada_m2: '120',
    area_verde_tipo_uso_id: 1, area_verde_tipo_uso_nombre: 'Recreación', area_verde_activa: true,
  }],
  listarTodasLasAreasVerdes: async () => [],
  asignarPoligonoMapa: vi.fn(),
}))
vi.mock('@/services/api/catalogosInventario', () => ({
  listarTiposUso: async () => [{ id: 1, nombre: 'Recreación', color: 'green' }],
}))
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))
vi.mock('@/sesion/ContextoSesion', () => ({ useSesionActiva: () => null }))

afterEach(() => {
  cleanup()
  listarEjemplaresDeArea.mockClear()
})

it('abre un jardín enlazado, carga sus ejemplares y filtra incluso los polígonos sin clasificar', async () => {
  const usuario = userEvent.setup()
  render(<MemoryRouter initialEntries={['/mapa?area=42']}><MapaAreasVerdesPage /></MemoryRouter>)

  expect(await screen.findByRole('heading', { name: 'Bosque Húmedo' })).toBeTruthy()
  expect(screen.getByRole('img', { name: '3 polígonos visibles' }).getAttribute('viewBox')).not.toBe('0 0 1000 700')
  expect(listarEjemplaresDeArea).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Mostrar ejemplares' }))
  const ejemplares = await screen.findByRole('combobox', { name: 'Ejemplares con coordenadas' })
  expect(listarEjemplaresDeArea).toHaveBeenCalledWith(42, expect.any(AbortSignal))
  expect(within(ejemplares).getByRole('option', { name: 'AR-01 · Molle' })).toBeTruthy()
  expect(within(ejemplares).queryByRole('option', { name: /AR-02/ })).toBeNull()
  expect(screen.getByRole('link', { name: 'Buscar ficha en el inventario' }).getAttribute('href')).toContain('q=Bosque+H%C3%BAmedo')

  const inventario = screen.getByRole('button', { name: 'Recreación · Inventario 1' })
  const fuente = screen.getByRole('button', { name: 'Recreación · Mapa 1' })
  fireEvent.click(inventario)
  expect(inventario.getAttribute('aria-pressed')).toBe('true')
  expect(screen.getByRole('img', { name: '1 polígonos visibles' })).toBeTruthy()
  fireEvent.click(fuente)
  expect(fuente.getAttribute('aria-pressed')).toBe('true')
  expect(inventario.getAttribute('aria-pressed')).toBe('false')

  fireEvent.click(screen.getByRole('button', { name: 'Sin catalogar 1' }))
  expect(screen.getByRole('img', { name: '1 polígonos visibles' })).toBeTruthy()
  expect(screen.queryByRole('heading', { name: 'Bosque Húmedo' })).toBeNull()

  fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar jardín' }), { target: { value: 'jardin central' } })
  const resultados = screen.getByRole('list', { name: 'Jardines encontrados' })
  expect(within(resultados).getAllByRole('button')).toHaveLength(3)
  within(resultados).getByRole('button', { name: /200 m²/ }).focus()
  await usuario.keyboard('{Enter}')
  expect(screen.getByRole('heading', { name: 'Jardín Central' })).toBeTruthy()
  expect(screen.getByRole('img', { name: '3 polígonos visibles' })).toBeTruthy()
})
