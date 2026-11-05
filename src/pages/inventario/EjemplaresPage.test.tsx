// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import EjemplaresPage from './EjemplaresPage'

const { listarEjemplares } = vi.hoisted(() => ({ listarEjemplares: vi.fn(async (q = '') => {
  const ejemplares = [
    { id: 1, codigo: 'ARB-0001', codigo_placa_antigua: 'PLACA-55', especie_nombre_comun: 'Molle', especie_nombre_cientifico: 'Schinus molle', especie_forma_biologica: 'Árbol', referencia_catastro: null, codigo_catastro: null, tipo_vegetacion: null, ubicacion: 'Parque', latitud: -12.1, longitud: -77.1, cantidad: 1, area_verde_id: null, especie_id: 1, advertencia_placa_repetida: true },
    { id: 2, codigo: 'ARB-0002', codigo_placa_antigua: 'PLACA-55', especie_nombre_comun: 'Molle', especie_nombre_cientifico: 'Schinus molle', especie_forma_biologica: 'Árbol', referencia_catastro: null, codigo_catastro: null, tipo_vegetacion: null, ubicacion: 'Parque', latitud: null, longitud: null, cantidad: 1, area_verde_id: null, especie_id: 1, advertencia_placa_repetida: true },
  ]
  if (!q) return [ejemplares[0]]
  if (q === 'PLACA-55') return ejemplares
  return []
}) }))

vi.mock('@/services/api/ejemplares', () => ({
  listarEjemplares,
  listarEspecies: async () => [],
  crearEjemplar: vi.fn(),
  crearEspecie: vi.fn(),
  cambiarEspecie: vi.fn(),
  quitarPlacaAntigua: vi.fn(),
}))
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))
vi.mock('@/sesion/ContextoSesion', () => ({ useSesionActiva: () => ({ usuario: { id: 7 }, roles: ['Jefe de sección'] }) }))
vi.mock('@/config/permisosCore', () => ({ PERMISOS: { registrarInventario: 'registrar', gestionarCatalogos: 'gestionar' }, puede: () => true }))
vi.mock('@/layouts/LayoutOficina/AccionesPagina', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))

afterEach(() => {
  cleanup()
  listarEjemplares.mockClear()
})

describe('EjemplaresPage', () => {
  it('busca por placa antigua, distingue varias coincidencias y abre la ficha del resultado', async () => {
    render(<MemoryRouter><EjemplaresPage /></MemoryRouter>)
    expect(await screen.findByText('ARB-0001', { selector: 'strong' })).toBeTruthy()

    fireEvent.change(screen.getByRole('searchbox', { name: 'Código nuevo o placa antigua' }), { target: { value: 'PLACA-55' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(await screen.findByText(/ARB-0002 · Molle/)).toBeTruthy()
    expect(listarEjemplares).toHaveBeenLastCalledWith('PLACA-55', 1, expect.any(AbortSignal))
    fireEvent.click(screen.getByRole('button', { name: /ARB-0002 · Molle/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Abrir ficha' }))
    expect(screen.getByText('Sin coordenadas')).toBeTruthy()
  })

  it('muestra vacío y exige el nombre científico al crear especie', async () => {
    render(<MemoryRouter><EjemplaresPage /></MemoryRouter>)
    expect(await screen.findByText('ARB-0001', { selector: 'strong' })).toBeTruthy()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Código nuevo o placa antigua' }), { target: { value: 'NO-EXISTE' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(await screen.findByText('Sin coincidencias')).toBeTruthy()
    await waitFor(() => expect(screen.getByLabelText('Nombre científico')).toHaveProperty('required', true))
  })
})
