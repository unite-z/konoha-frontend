// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import type { AreasVerdesGeoJSON } from '@/services/api/mapaInventario'
import MapaAreasVerdesPage from './MapaAreasVerdesPage'

const { listarEjemplaresDePoligono, revisarImpactoPoligono, asignarPoligonoMapa, puedeEditar } = vi.hoisted(() => ({
  puedeEditar: vi.fn(() => false),
  revisarImpactoPoligono: vi.fn(async () => ({
    area_anterior_id: 42, reasignables: [{ id: 1, codigo: 'AR-01' }], conflictos: [],
  })),
  asignarPoligonoMapa: vi.fn(async () => ({ area_verde_id: 43 })),
  listarEjemplaresDePoligono: vi.fn(async () => [
    { id: 1, codigo: 'AR-01', latitud: -12.001, longitud: -77.002, especie_nombre_comun: 'Molle', especie_nombre_cientifico: 'Schinus molle' },
    { id: 2, codigo: 'AR-02', latitud: null, longitud: -77.002, especie_nombre_comun: 'Tara', especie_nombre_cientifico: 'Tara spinosa' },
  ]),
}))

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
  listarTodasLasAreasVerdes: async () => [
    { id: 42, nombre: 'Bosque Húmedo', lugar: 'Campus' },
    { id: 43, nombre: 'Jardín nuevo', lugar: 'Campus' },
  ],
  asignarPoligonoMapa,
  revisarImpactoPoligono,
  listarEjemplaresDePoligono,
}))
vi.mock('@/services/api/catalogosInventario', () => ({
  listarTiposUso: async () => [{ id: 1, nombre: 'Recreación', color: 'green' }],
}))
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))
vi.mock('@/sesion/ContextoSesion', () => ({ useSesionActiva: () => null }))

vi.mock('@/config/permisosCore', () => ({ PERMISOS: { gestionarCatalogos: 'gestionar' }, puede: puedeEditar }))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.open = true }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.open = false }
})

afterEach(() => {
  cleanup()
  listarEjemplaresDePoligono.mockClear()
  revisarImpactoPoligono.mockClear()
  asignarPoligonoMapa.mockClear()
  puedeEditar.mockReturnValue(false)
})

it('agrupa usos homónimos, conserva el origen en el detalle y permite consultar los ejemplares', async () => {
  const usuario = userEvent.setup()
  render(<MemoryRouter initialEntries={['/mapa?area=42']}><MapaAreasVerdesPage /></MemoryRouter>)

  expect(await screen.findByRole('heading', { name: 'Bosque Húmedo' })).toBeTruthy()
  expect(screen.getByRole('img', { name: '3 áreas visibles en el mapa' }).getAttribute('viewBox')).not.toBe('0 0 1000 700')
  expect(listarEjemplaresDePoligono).not.toHaveBeenCalled()
  const mapa = screen.getByRole('img', { name: '3 áreas visibles en el mapa' })
  const vistaArea = mapa.getAttribute('viewBox')
  const poligono = mapa.querySelector('path[fill-rule="evenodd"]')
  if (!poligono) throw new Error('Falta el polígono')
  fireEvent.mouseEnter(poligono)
  const tooltip = screen.getAllByRole('status').find((estado) => estado.textContent?.includes('Tipo de uso:'))
  expect(tooltip?.textContent).toContain('Bosque Húmedo')
  fireEvent.mouseLeave(mapa)
  fireEvent.click(screen.getByRole('button', { name: 'Mostrar ejemplares' }))
  const panel = within(screen.getByRole('region', { name: 'Ejemplares en el área seleccionada' }))
  expect((await panel.findByRole('link', { name: 'Abrir ficha' })).getAttribute('href')).toContain('ejemplar=AR-01')
  expect(listarEjemplaresDePoligono).toHaveBeenCalledWith('p-1', expect.any(AbortSignal))
  expect(panel.getByText('Sin área vinculada')).toBeTruthy()
  expect(panel.queryByRole('combobox')).toBeNull()
  expect(panel.queryByRole('searchbox')).toBeNull()
  await waitFor(() => expect(mapa.getAttribute('viewBox')).not.toBe(vistaArea))
  expect(screen.getByRole('link', { name: 'Ver área en el inventario' }).getAttribute('href')).toContain('q=Bosque+H%C3%BAmedo')

  const recreacion = screen.getByRole('button', { name: 'Recreación 2' })
  fireEvent.click(recreacion)
  expect(recreacion.getAttribute('aria-pressed')).toBe('true')
  expect(screen.getByRole('img', { name: '2 áreas visibles en el mapa' })).toBeTruthy()
  expect(screen.getByText('Origen del tipo de uso · Ficha del inventario')).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Sin catalogar 1' }))
  expect(screen.getByRole('img', { name: '1 área visible en el mapa' })).toBeTruthy()
  expect(screen.queryByRole('heading', { name: 'Bosque Húmedo' })).toBeNull()

  fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar jardín' }), { target: { value: 'jardin central' } })
  const resultados = screen.getByRole('list', { name: 'Jardines encontrados' })
  expect(within(resultados).getAllByRole('button')).toHaveLength(3)
  fireEvent.click(recreacion)
  within(resultados).getByRole('button', { name: /200 m²/ }).focus()
  await usuario.keyboard('{Enter}')
  expect(screen.getByRole('heading', { name: 'Jardín Central' })).toBeTruthy()
  expect(screen.getByText('Origen del tipo de uso · Mapa original')).toBeTruthy()
  expect(screen.getByRole('img', { name: '2 áreas visibles en el mapa' })).toBeTruthy()
})

it('muestra los ejemplares afectados antes de confirmar el cambio de área', async () => {
  puedeEditar.mockReturnValue(true)
  render(<MemoryRouter initialEntries={['/mapa?poligono=p-1']}><MapaAreasVerdesPage /></MemoryRouter>)

  const selector = await screen.findByRole('combobox', { name: 'Cambiar área vinculada' })
  expect(screen.getByRole('button', { name: 'Guardar vínculo' }).getAttribute('aria-disabled')).toBe('true')
  fireEvent.change(selector, { target: { value: '43' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar vínculo' }))
  const dialogo = within(await screen.findByRole('dialog', { name: 'Cambiar el vínculo del área del mapa' }))
  expect(dialogo.getByText('AR-01')).toBeTruthy()
  expect(revisarImpactoPoligono).toHaveBeenCalledWith('p-1', 43)
  expect(asignarPoligonoMapa).not.toHaveBeenCalled()

  fireEvent.click(dialogo.getByRole('button', { name: 'Confirmar reasignación' }))
  expect(await screen.findByText('Vínculo guardado.')).toBeTruthy()
  expect(asignarPoligonoMapa).toHaveBeenCalledWith('p-1', 43, {
    area_anterior_id: 42, reasignables: [{ id: 1, codigo: 'AR-01' }], conflictos: [],
  })
})

it('sincroniza el selector con los marcadores cuando hay varios ejemplares', async () => {
  listarEjemplaresDePoligono.mockResolvedValueOnce([
    { id: 1, codigo: 'AR-01', latitud: -12.001, longitud: -77.002, especie_nombre_comun: 'Molle', especie_nombre_cientifico: 'Schinus molle' },
    { id: 2, codigo: 'AR-02', latitud: -12.0005, longitud: -77.001, especie_nombre_comun: 'Tara', especie_nombre_cientifico: 'Tara spinosa' },
  ])
  render(<MemoryRouter initialEntries={['/mapa?poligono=p-1']}><MapaAreasVerdesPage /></MemoryRouter>)
  fireEvent.click(await screen.findByRole('button', { name: 'Mostrar ejemplares' }))
  const panel = within(screen.getByRole('region', { name: 'Ejemplares en el área seleccionada' }))
  const selector = await panel.findByRole('combobox')
  expect(panel.queryByRole('link', { name: 'Abrir ficha' })).toBeNull()
  fireEvent.change(selector, { target: { value: '2' } })
  expect(panel.getByRole('link', { name: 'Abrir ficha' }).getAttribute('href')).toContain('ejemplar=AR-02')
  const primerMarcador = screen.getByRole('img').querySelector('circle')
  if (!primerMarcador) throw new Error('Falta el marcador')
  fireEvent.click(primerMarcador)
  expect(selector).toHaveProperty('value', '1')
  expect(panel.getByRole('link', { name: 'Abrir ficha' }).getAttribute('href')).toContain('ejemplar=AR-01')

  const buscar = panel.getByRole('searchbox', { name: 'Buscar ejemplares en esta área' })
  const mapa = screen.getByRole('img')
  for (const [termino, codigo] of [['ar-02', 'AR-02'], ['MÓLLE', 'AR-01'], ['spinosa', 'AR-02']]) {
    fireEvent.change(buscar, { target: { value: termino } })
    expect(mapa.querySelectorAll('circle')).toHaveLength(1)
    expect(panel.getByText('1 ejemplar encontrado')).toBeTruthy()
    expect(panel.getByRole('link', { name: 'Abrir ficha' }).getAttribute('href')).toContain('ejemplar=' + codigo)
  }
  fireEvent.change(buscar, { target: { value: 'Sin coincidencia' } })
  expect(panel.getByText('No hay ejemplares que coincidan con la búsqueda.')).toBeTruthy()
  expect(panel.queryByRole('link', { name: 'Abrir ficha' })).toBeNull()
  expect(mapa.querySelectorAll('circle')).toHaveLength(0)

  fireEvent.change(buscar, { target: { value: '' } })
  expect(panel.getByRole('combobox')).toBeTruthy()
  expect(mapa.querySelectorAll('circle')).toHaveLength(2)
  expect(listarEjemplaresDePoligono).toHaveBeenCalledTimes(1)
})
