// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MapaAreasVerdesPage from './MapaAreasVerdesPage'
import type { AreasVerdesGeoJSON } from '@/services/api/mapaInventario'

const ID_QWE = '6578596a-f23b-5cef-8d61-0977c37eacbd'

const datos: AreasVerdesGeoJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { mapa_id: ID_QWE, Uso: 'Áreas deportivas y recreación activa', Nombre: 'Polígono original', Área: 20 },
      geometry: { type: 'MultiPolygon', coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]] },
    },
    {
      type: 'Feature',
      properties: { mapa_id: 'poligono-otro', Uso: 'Áreas deportivas y recreación activa', Nombre: 'Otro polígono', Área: 15 },
      geometry: { type: 'MultiPolygon', coordinates: [[[[2, 0], [3, 0], [3, 1], [2, 1], [2, 0]]]] },
    },
  ],
}

const mocks = vi.hoisted(() => ({
  cargarAreasVerdesGeoJSON: vi.fn(),
  listarUsosFuenteMapa: vi.fn(),
  listarPoligonosMapa: vi.fn(),
  listarTodasLasAreasVerdes: vi.fn(),
  listarTiposUso: vi.fn(),
  asignarPoligonoMapa: vi.fn(),
  puede: vi.fn((_sesion: unknown, _permiso: string) => false),
}))

vi.mock('@/services/api/mapaInventario', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/services/api/mapaInventario')>(),
  cargarAreasVerdesGeoJSON: mocks.cargarAreasVerdesGeoJSON,
}))
vi.mock('@/services/api/mapaAsignaciones', () => ({
  listarUsosFuenteMapa: mocks.listarUsosFuenteMapa,
  clasificarUsoFuenteMapa: vi.fn(),
  listarPoligonosMapa: mocks.listarPoligonosMapa,
  asignarPoligonoMapa: mocks.asignarPoligonoMapa,
  listarTodasLasAreasVerdes: mocks.listarTodasLasAreasVerdes,
}))
vi.mock('@/services/api/catalogosInventario', () => ({ listarTiposUso: mocks.listarTiposUso }))
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))
vi.mock('@/sesion/ContextoSesion', () => ({ useSesionActiva: () => ({ usuario: { id: 1 }, roles: [] }) }))
vi.mock('@/config/permisosCore', () => ({ PERMISOS: { gestionarCatalogos: 'gestionar', registrarInventario: 'registrar' }, puede: mocks.puede }))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  mocks.puede.mockReturnValue(false)
})

describe('MapaAreasVerdesPage', () => {
  it('abre, centra y selecciona qwe desde el enlace profundo; mantiene la selección al elegir otro polígono', async () => {
    mocks.cargarAreasVerdesGeoJSON.mockResolvedValue(datos)
    mocks.listarUsosFuenteMapa.mockResolvedValue([])
    mocks.listarPoligonosMapa.mockResolvedValue([
      { id_fuente: ID_QWE, area_verde_id: 1, area_verde_nombre: 'qwe', area_verde_superficie_m2: '0.03', area_verde_tipo_uso_id: 4, area_verde_tipo_uso_nombre: 'Deportivo' },
      { id_fuente: 'poligono-otro', area_verde_id: 2, area_verde_nombre: 'Otro jardín', area_verde_superficie_m2: '15', area_verde_tipo_uso_id: 4, area_verde_tipo_uso_nombre: 'Deportivo' },
    ])
    mocks.listarTodasLasAreasVerdes.mockResolvedValue([])
    mocks.listarTiposUso.mockResolvedValue([{ id: 4, nombre: 'Deportivo', activo: true }])

    const { container } = render(
      <MemoryRouter initialEntries={[`/areas-verdes/mapa?poligono=${ID_QWE}&centrar=1`]}>
        <MapaAreasVerdesPage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'qwe' })).toBeTruthy()
    expect(screen.getByText('Clasificación efectiva:').parentElement?.textContent).toContain('Deportivo')
    const filtro = screen.getByRole('combobox', { name: 'Filtrar por clasificación' })
    expect((filtro as HTMLSelectElement).value).toBe('tipo:4')

    const svg = container.querySelector('svg')
    const poligonosIniciales = container.querySelectorAll('svg path[class]')
    const poligonoQwe = poligonosIniciales[0]
    const poligonoOtro = poligonosIniciales[1]
    if (!svg || !poligonoQwe || !poligonoOtro) throw new Error('No se encontraron los polígonos de prueba.')
    expect(poligonoQwe.getAttribute('stroke-width')).toBe('3')
    fireEvent.mouseLeave(poligonoQwe)
    expect(poligonoQwe.getAttribute('stroke-width')).toBe('3')
    expect(poligonoQwe.getAttribute('stroke-dasharray')).toBe('5 2')

    fireEvent.click(poligonoOtro)
    expect(await screen.findByRole('heading', { name: 'Otro jardín' })).toBeTruthy()
    await waitFor(() => expect(poligonoOtro.getAttribute('stroke-width')).toBe('3'))
    expect(poligonoQwe.getAttribute('stroke-width')).toBe('1.3')
  })

  it('en modo de alta permite elegir el polígono y vincular una ficha existente como qwe', async () => {
    mocks.cargarAreasVerdesGeoJSON.mockResolvedValue(datos)
    mocks.listarUsosFuenteMapa.mockResolvedValue([])
    mocks.listarPoligonosMapa.mockResolvedValue([
      { id_fuente: ID_QWE, area_verde_id: 1, area_verde_nombre: 'qwe', area_verde_superficie_m2: '0.03', area_verde_tipo_uso_id: 4, area_verde_tipo_uso_nombre: 'Deportivo' },
    ])
    mocks.listarTodasLasAreasVerdes.mockResolvedValue([{ id: 1, nombre: 'qwe', lugar: 'Campus', ubicacion: 'Prueba', superficie_m2: '0.03', tipo_cobertura_id: null, tipo_cobertura_nombre: null, tipo_uso_id: 4, tipo_uso_nombre: 'Deportivo', activo: true }])
    mocks.listarTiposUso.mockResolvedValue([{ id: 4, nombre: 'Deportivo', activo: true }])
    mocks.asignarPoligonoMapa.mockResolvedValue({ id_fuente: 'poligono-otro', area_verde_id: 1, area_verde_nombre: 'qwe', area_verde_superficie_m2: '0.03', area_verde_tipo_uso_id: 4, area_verde_tipo_uso_nombre: 'Deportivo' })
    mocks.puede.mockImplementation((_sesion: unknown, permiso: string) => permiso === 'gestionar' || permiso === 'registrar')

    const { container } = render(
      <MemoryRouter initialEntries={['/areas-verdes/mapa?modo=registrar']}>
        <MapaAreasVerdesPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/Elige en el mapa el jardín/)).toBeTruthy()
    fireEvent.click(container.querySelectorAll('svg path[class]')[1])
    expect(await screen.findByRole('heading', { name: 'Otro polígono' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Registrar este jardín' }).getAttribute('href')).toContain('poligono=poligono-otro')
    fireEvent.change(screen.getByRole('combobox', { name: 'Área del inventario vinculada' }), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Vincular ficha existente' }))

    await waitFor(() => expect(mocks.asignarPoligonoMapa).toHaveBeenCalledWith('poligono-otro', 1))
    expect(await screen.findByText('Vinculado con qwe.')).toBeTruthy()
  })
})
