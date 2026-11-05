// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import NuevaAreaVerdePage from './NuevaAreaVerdePage'
import type { AreasVerdesGeoJSON } from '@/services/api/mapaInventario'

const ID_JARDIN = 'poligono-nombre'

const mocks = vi.hoisted(() => ({
  cargarGeoJSON: vi.fn(),
  listarVinculos: vi.fn(),
  registrarArea: vi.fn(),
  asignarPoligono: vi.fn(),
  puede: vi.fn(() => true),
}))

vi.mock('@/services/api/mapaInventario', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/services/api/mapaInventario')>(),
  cargarAreasVerdesGeoJSON: mocks.cargarGeoJSON,
}))
vi.mock('@/services/api/mapaAsignaciones', () => ({ listarPoligonosMapa: mocks.listarVinculos, asignarPoligonoMapa: mocks.asignarPoligono }))
vi.mock('@/services/api/areasVerdes', () => ({ registrarAreaVerde: mocks.registrarArea }))
vi.mock('@/services/api/coberturas', () => ({ listarCoberturas: async () => [] }))
vi.mock('@/services/api/catalogosInventario', () => ({
  listarTiposUso: async () => [],
  listarSectores: async () => [],
  listarCuarteles: async () => [],
}))
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))
vi.mock('@/sesion/ContextoSesion', () => ({ useSesionActiva: () => ({ usuario: { id: 1 }, roles: [] }) }))
vi.mock('@/config/permisosCore', () => ({ PERMISOS: { registrarInventario: 'registrar' }, puede: mocks.puede }))

function UbicacionActual() {
  const ubicacion = useLocation()
  return <output data-testid="ubicacion-actual">{ubicacion.pathname}{ubicacion.search}</output>
}

const geojson: AreasVerdesGeoJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { mapa_id: ID_JARDIN, Nombre: 'Jardín de prueba', Referenc_1: 'Pabellón X', Área: 37.456 },
      geometry: { type: 'MultiPolygon', coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 0]]]] },
    },
    {
      type: 'Feature',
      properties: { mapa_id: 'poligono-sin-nombre', Nombre: null, Referenc_1: null, Área: 12.5 },
      geometry: { type: 'MultiPolygon', coordinates: [[[[2, 0], [3, 0], [3, 1], [2, 0]]]] },
    },
  ],
}

function renderAlta(id = ID_JARDIN) {
  return render(
    <MemoryRouter initialEntries={[`/areas-verdes/nueva?poligono=${id}`]}>
      <UbicacionActual />
      <Routes>
        <Route path="/areas-verdes/nueva" element={<NuevaAreaVerdePage />} />
        <Route path="/areas-verdes/mapa" element={<p>Mapa listo</p>} />
        <Route path="/areas-verdes" element={<p>Inventario listo</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mocks.cargarGeoJSON.mockResolvedValue(geojson)
  mocks.listarVinculos.mockResolvedValue([])
  mocks.puede.mockReturnValue(true)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('NuevaAreaVerdePage desde el mapa', () => {
  it('precarga los datos del GeoJSON y reintenta un vínculo fallido sin duplicar la ficha', async () => {
    mocks.registrarArea.mockResolvedValue({ id: 42, nombre: 'Jardín de prueba', lugar: 'Pabellón X', ubicacion: 'Campus', superficie_m2: '37.46', tipo_cobertura_id: null, tipo_cobertura_nombre: null, activo: true })
    mocks.asignarPoligono.mockRejectedValueOnce(new Error('API temporalmente no disponible')).mockResolvedValueOnce({ id_fuente: ID_JARDIN, area_verde_id: 42 })
    const { container } = renderAlta()

    const nombre = await screen.findByLabelText(/Nombre/) as HTMLInputElement
    const referente = screen.getByLabelText(/Lugar o referente/) as HTMLInputElement
    const superficie = screen.getByLabelText(/Superficie \(m²\)/) as HTMLInputElement
    expect(nombre.value).toBe('Jardín de prueba')
    expect(referente.value).toBe('Pabellón X')
    expect(superficie.value).toBe('37.46')

    fireEvent.change(screen.getByLabelText(/Ubicación/), { target: { value: 'Campus central' } })
    const formulario = container.querySelector('form')
    if (!formulario) throw new Error('No se encontró el formulario de registro.')
    fireEvent.submit(formulario)
    expect(await screen.findByText(/se creó con el código 42, pero no se pudo vincular/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reintentar vínculo' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar vínculo' }))

    await waitFor(() => expect(screen.getByText('Mapa listo')).toBeTruthy())
    expect(mocks.registrarArea).toHaveBeenCalledTimes(1)
    expect(mocks.asignarPoligono).toHaveBeenCalledTimes(2)
    expect(mocks.asignarPoligono).toHaveBeenLastCalledWith(ID_JARDIN, 42)
    expect(screen.getByTestId('ubicacion-actual').textContent).toBe(`/areas-verdes/mapa?poligono=${ID_JARDIN}&centrar=1&registrada=1`)
  })

  it('deja vacío el nombre de un polígono sin nombre y precarga la superficie disponible', async () => {
    renderAlta('poligono-sin-nombre')
    expect((await screen.findByLabelText(/Nombre/) as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText(/Lugar o referente/) as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText(/Superficie \(m²\)/) as HTMLInputElement).value).toBe('12.5')
  })

  it('cancela y regresa al modo de selección con el polígono conservado', async () => {
    renderAlta()
    await screen.findByLabelText(/Nombre/)
    fireEvent.click(screen.getByRole('link', { name: 'Cancelar y volver al mapa' }))
    await waitFor(() => expect(screen.getByText('Mapa listo')).toBeTruthy())
    expect(screen.getByTestId('ubicacion-actual').textContent).toBe(`/areas-verdes/mapa?modo=registrar&poligono=${ID_JARDIN}&centrar=1`)
  })
})
