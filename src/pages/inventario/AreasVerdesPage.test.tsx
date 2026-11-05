// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AreasVerdesPage from './AreasVerdesPage'

const { listarAreasVerdes, listarPoligonosMapa } = vi.hoisted(() => ({
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
  listarPoligonosMapa: vi.fn(async () => [{
    id_fuente: 'qwe-poligono',
    area_verde_id: 1,
    area_verde_nombre: 'Jardín ornamental',
    area_verde_superficie_m2: '10',
    area_verde_tipo_uso_id: 11,
    area_verde_tipo_uso_nombre: 'Ornamental',
  }]),
}))

vi.mock('@/services/api/areasVerdes', () => ({
  listarAreasVerdes,
  asignarSectorArea: vi.fn(),
  listarHistorialSectorArea: vi.fn(),
}))
vi.mock('@/services/api/mapaAsignaciones', () => ({ listarPoligonosMapa }))
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
  listarPoligonosMapa.mockClear()
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

  it('ofrece abrir en el mapa el polígono vinculado a cada área', async () => {
    render(<MemoryRouter><AreasVerdesPage /></MemoryRouter>)

    const enlace = await screen.findByRole('link', { name: 'Ver en el mapa: Jardín ornamental' })
    expect(enlace.getAttribute('href')).toBe('/areas-verdes/mapa?poligono=qwe-poligono&centrar=1')
    expect(screen.queryByRole('link', { name: 'Ver en el mapa: Cancha deportiva' })).toBeNull()
  })

  it('inicia el registro eligiendo primero un polígono existente del mapa', async () => {
    render(<MemoryRouter><AreasVerdesPage /></MemoryRouter>)
    const enlace = await screen.findByRole('link', { name: 'Registrar área' })
    expect(enlace.getAttribute('href')).toBe('/areas-verdes/mapa?modo=registrar')
  })
})
