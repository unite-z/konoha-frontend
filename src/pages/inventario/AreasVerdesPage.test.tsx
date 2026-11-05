// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AreasVerdesPage from './AreasVerdesPage'

const { listarAreasVerdes } = vi.hoisted(() => ({
  listarAreasVerdes: vi.fn(async (_q = '', _signal?: AbortSignal, filtros?: { tipo_uso_id?: number }) => {
    const area = (id: number, nombre: string, tipoUsoId: number, tipoUsoNombre: string) => ({
      id,
      nombre,
      lugar: 'Campus',
      ubicacion: 'Prueba',
      superficie_m2: '10',
      tipo_cobertura_id: null,
      tipo_cobertura_nombre: null,
      tipo_uso_id: tipoUsoId,
      tipo_uso_nombre: tipoUsoNombre,
      activo: true,
    })
    const areas = [
      area(1, 'Jardín ornamental', 11, 'Ornamental'),
      area(2, 'Cancha deportiva', 22, 'Deportivo'),
    ]
    const results = filtros?.tipo_uso_id
      ? areas.filter((item) => item.tipo_uso_id === filtros.tipo_uso_id)
      : areas
    return { count: results.length, next: null, previous: null, results }
  }),
}))

vi.mock('@/services/api/areasVerdes', () => ({
  listarAreasVerdes,
  asignarSectorArea: vi.fn(),
  listarHistorialSectorArea: vi.fn(),
}))
vi.mock('@/services/api/catalogosInventario', () => ({
  listarSectores: async () => [],
  listarCuarteles: async () => [],
  listarTiposUso: async () => [
    { id: 11, nombre: 'Ornamental', activo: true },
    { id: 22, nombre: 'Deportivo', activo: true },
  ],
}))
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))
vi.mock('@/sesion/ContextoSesion', () => ({
  useSesionActiva: () => ({ usuario: { id: 7 }, roles: ['Jefe de sección'] }),
}))
vi.mock('@/config/permisosCore', () => ({
  PERMISOS: { gestionarCatalogos: 'gestionar' },
  puede: () => false,
}))
vi.mock('@/layouts/LayoutOficina/AccionesPagina', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

afterEach(() => {
  cleanup()
  listarAreasVerdes.mockClear()
})

describe('AreasVerdesPage', () => {
  it('aplica el tipo de uso elegido en la consulta y muestra la clasificación de cada resultado', async () => {
    render(<MemoryRouter><AreasVerdesPage /></MemoryRouter>)

    expect(await screen.findByText('Jardín ornamental')).toBeTruthy()
    expect(screen.getByText('Cancha deportiva')).toBeTruthy()
    expect(screen.getAllByText('Ornamental').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Deportivo').length).toBeGreaterThan(0)

    fireEvent.change(screen.getByRole('combobox', { name: 'Tipo de uso' }), {
      target: { value: '22' },
    })

    await waitFor(() => {
      expect(listarAreasVerdes).toHaveBeenLastCalledWith(
        '',
        expect.any(AbortSignal),
        { sector_id: undefined, cuartel_id: undefined, tipo_uso_id: 22 },
      )
    })
    expect(await screen.findByText('Cancha deportiva')).toBeTruthy()
    await waitFor(() => expect(screen.queryByText('Jardín ornamental')).toBeNull())
    expect(screen.getAllByText('Deportivo').length).toBeGreaterThan(0)
  })
})
