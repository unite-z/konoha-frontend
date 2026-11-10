// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import AreasVerdesPage from './AreasVerdesPage'

const { listarAreasVerdes, asignarSectorArea, puede } = vi.hoisted(() => ({
  asignarSectorArea: vi.fn().mockResolvedValue(undefined),
  puede: vi.fn(() => false),
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
      sector_id: id === 1 ? 1 : null,
      sector_nombre: id === 1 ? 'Sector A' : null,
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
  asignarSectorArea,
  listarHistorialSectorArea: vi.fn(),
}))
vi.mock('@/services/api/catalogosInventario', () => ({
  listarSectores: async () => [{ id: 1, nombre: 'Sector A' }, { id: 2, nombre: 'Sector B' }],
  listarCuarteles: async () => [],
  listarTiposUso: async () => [
    { id: 11, nombre: 'Ornamental', activo: true },
    { id: 22, nombre: 'Deportivo', activo: true },
  ],
}))
vi.mock('@/services/api/mapaAsignaciones', () => ({
  listarPoligonosMapa: async () => [{ id_fuente: 'poligono-1', area_verde_id: 1 }],
}))
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))
vi.mock('@/sesion/ContextoSesion', () => ({
  useSesionActiva: () => ({ usuario: { id: 7 }, roles: ['Jefe de sección'] }),
}))
vi.mock('@/config/permisosCore', () => ({
  PERMISOS: { gestionarCatalogos: 'gestionar' },
  puede,
}))
vi.mock('@/layouts/LayoutOficina/AccionesPagina', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.open = true }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.open = false }
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  puede.mockReturnValue(false)
})

describe('AreasVerdesPage', () => {
  it('pide confirmar antes de guardar un traspaso entre sectores', async () => {
    puede.mockReturnValue(true)
    render(<MemoryRouter><AreasVerdesPage /></MemoryRouter>)
    const selector = await screen.findByRole('combobox', { name: 'Sector de Jardín ornamental' })
    const fila = screen.getByRole('row', { name: /Jardín ornamental/ })
    fireEvent.change(selector, { target: { value: '2' } })
    const guardar = within(fila).getByRole('button', { name: 'Guardar' })
    fireEvent.click(guardar)
    const dialogo = screen.getByRole('dialog', { name: 'Confirmar traspaso de área' })
    expect(within(dialogo).getByText(/de Sector A a Sector B/)).toBeTruthy()
    expect(asignarSectorArea).not.toHaveBeenCalled()
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Volver' }))
    expect(asignarSectorArea).not.toHaveBeenCalled()
    fireEvent.click(guardar)
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar traspaso' }))
    await waitFor(() => expect(asignarSectorArea).toHaveBeenCalledExactlyOnceWith(1, 2))
  })

  it('aplica el tipo de uso elegido en la consulta y muestra la clasificación de cada resultado', async () => {
    render(<MemoryRouter><AreasVerdesPage /></MemoryRouter>)

    expect(await screen.findByText('Jardín ornamental')).toBeTruthy()
    expect(screen.getByText('Cancha deportiva')).toBeTruthy()
    const enlace = await screen.findByRole('link', { name: 'Ver en el mapa · Jardín ornamental' })
    expect(enlace.getAttribute('href')).toMatch(/\/mapa\?area=1$/)
    expect(screen.queryByRole('link', { name: 'Ver en el mapa · Cancha deportiva' })).toBeNull()
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
