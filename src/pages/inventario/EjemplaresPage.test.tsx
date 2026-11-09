// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import EjemplaresPage from './EjemplaresPage'
import { cambiarSituacionEjemplar, guardarAlturaEjemplar, listarHistorialEjemplar, vincularEjemplarConArea } from '@/services/api/ejemplares'

const { listarEjemplares, alturas } = vi.hoisted(() => {
  const alturas = new Map<number, number>()
  return { alturas, listarEjemplares: vi.fn(async (q = '') => {
  const ejemplares = [
    { id: 1, codigo: 'ARB-0001', codigo_placa_antigua: 'PLACA-55', especie_nombre_comun: 'Molle', especie_nombre_cientifico: 'Schinus molle', especie_forma_biologica: 'Árbol', referencia_catastro: null, codigo_catastro: null, tipo_vegetacion: null, ubicacion: 'Parque', latitud: -12.1, longitud: -77.1, cantidad: 1, area_verde_id: null, especie_id: 1, advertencia_placa_repetida: true },
    { id: 2, codigo: 'ARB-0002', codigo_placa_antigua: 'PLACA-55', especie_nombre_comun: 'Molle', especie_nombre_cientifico: 'Schinus molle', especie_forma_biologica: 'Árbol', referencia_catastro: 'Plano 2', codigo_catastro: 'CAT-22', tipo_vegetacion: null, ubicacion: 'Parque', latitud: null, longitud: null, cantidad: 1, area_verde_id: null, especie_id: 1, advertencia_placa_repetida: true },
  ]
    const resultados = !q ? [ejemplares[0]] : q === 'PLACA-55' ? ejemplares : []
    return resultados.map((ejemplar) => ({ ...ejemplar, altura_total_m: alturas.get(ejemplar.id) ?? null }))
  }) }
})

vi.mock('@/services/api/ejemplares', () => ({
  listarEjemplares,
  listarEspecies: async () => [],
  crearEjemplar: vi.fn(),
  crearEspecie: vi.fn(),
  cambiarEspecie: vi.fn(),
  quitarPlacaAntigua: vi.fn(),
  vincularEjemplarConArea: vi.fn(),
  listarHistorialEjemplar: vi.fn(async () => []),
  listarHistorialSituacionEjemplar: async () => [],
  cambiarSituacionEjemplar: vi.fn(async () => ({ area_verde_id: null })),
  guardarAlturaEjemplar: vi.fn(async (id: number, altura: number) => { alturas.set(id, altura) }),
}))
vi.mock('@/services/api/mapaAsignaciones', () => ({
  listarTodasLasAreasVerdes: async () => [{ id: 42, nombre: 'Bosque Húmedo', lugar: 'Campus' }],
}))
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))
vi.mock('@/sesion/ContextoSesion', () => ({ useSesionActiva: () => ({ usuario: { id: 7 }, roles: ['Jefe de sección'] }) }))
vi.mock('@/config/permisosCore', () => ({ PERMISOS: { registrarInventario: 'registrar', gestionarCatalogos: 'gestionar' }, puede: () => true }))
vi.mock('@/layouts/LayoutOficina/AccionesPagina', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))

afterEach(() => {
  cleanup()
  listarEjemplares.mockClear()
  alturas.clear()
})

describe('EjemplaresPage', () => {
  it('abre y cierra la ficha desde el listado inicial sin buscar y omite datos de catastro vacíos', async () => {
    render(<MemoryRouter><EjemplaresPage /></MemoryRouter>)
    const abrir = await screen.findByRole('button', { name: 'Abrir ficha de ARB-0001' })
    const listado = within(screen.getByRole('region', { name: 'Ejemplares' }))
    expect(listado.queryByText(/Referencia de catastro|Código de catastro/)).toBeNull()

    fireEvent.click(abrir)
    const ficha = screen.getByRole('group', { name: 'Ficha de ARB-0001' })
    expect(document.activeElement).toBe(ficha)
    expect(within(ficha).getByRole('heading', { name: 'Molle · ARB-0001' })).toBeTruthy()
    expect(listarEjemplares).toHaveBeenLastCalledWith('', 1, expect.any(AbortSignal))

    fireEvent.click(within(ficha).getByRole('button', { name: 'Cerrar ficha' }))
    expect(screen.queryByRole('group', { name: 'Ficha de ARB-0001' })).toBeNull()
    expect(document.activeElement).toBe(abrir)
  })

  it('busca por placa antigua, distingue varias coincidencias y abre la ficha del resultado', async () => {
    render(<MemoryRouter><EjemplaresPage /></MemoryRouter>)
    expect(await screen.findByText('ARB-0001', { selector: 'strong' })).toBeTruthy()

    fireEvent.change(screen.getByRole('searchbox', { name: 'Código nuevo o placa antigua' }), { target: { value: 'PLACA-55' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(await screen.findByRole('button', { name: 'Abrir ficha de ARB-0002' })).toBeTruthy()
    expect(listarEjemplares).toHaveBeenLastCalledWith('PLACA-55', 1, expect.any(AbortSignal))
    fireEvent.click(screen.getByRole('button', { name: 'Abrir ficha de ARB-0002' }))
    const ficha = within(screen.getByRole('group', { name: 'Ficha de ARB-0002' }))
    expect(ficha.getByText('Sin coordenadas')).toBeTruthy()
    expect(ficha.getByText('Plano 2')).toBeTruthy()
    expect(ficha.getByText('CAT-22')).toBeTruthy()
    fireEvent.change(await screen.findByRole('combobox', { name: 'Área verde del ejemplar' }), { target: { value: '42' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar vínculo' }))
    expect(vincularEjemplarConArea).toHaveBeenCalledWith(2, 42)
    expect(await screen.findByText('Área vinculada al ejemplar.')).toBeTruthy()
  })

  it('muestra vacío y exige el nombre científico al crear especie', async () => {
    render(<MemoryRouter><EjemplaresPage /></MemoryRouter>)
    expect(await screen.findByText('ARB-0001', { selector: 'strong' })).toBeTruthy()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Código nuevo o placa antigua' }), { target: { value: 'NO-EXISTE' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(await screen.findByText('Sin coincidencias')).toBeTruthy()
    await waitFor(() => expect(screen.getByLabelText('Nombre científico')).toHaveProperty('required', true))
  })

  it('recalcula la sugerencia según la altura guardada, incluido el umbral exacto', async () => {
    render(<MemoryRouter><EjemplaresPage /></MemoryRouter>)
    fireEvent.change(await screen.findByRole('searchbox', { name: 'Código nuevo o placa antigua' }), { target: { value: 'PLACA-55' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir ficha de ARB-0001' }))
    expect(screen.getByText('Pendiente de medir la altura')).toBeTruthy()

    for (const [altura, sugerencia] of [
      [4.99, 'Poda menor · menos de 5 m'],
      [5, 'Poda de altura mediante proveedor · 5 m o más'],
      [5.01, 'Poda de altura mediante proveedor · 5 m o más'],
    ] as const) {
      fireEvent.change(screen.getByRole('spinbutton', { name: 'Altura total (m)' }), { target: { value: String(altura) } })
      expect(screen.getByText('Altura sin guardar. La sugerencia se actualiza al guardar.')).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Guardar altura' }))
      expect(guardarAlturaEjemplar).toHaveBeenLastCalledWith(1, altura)
      expect(await screen.findByText(`${altura} m`)).toBeTruthy()
      expect(screen.getByText(sugerencia)).toBeTruthy()
    }
  })

  it('pide el destino para trasladar desde la ficha', async () => {
    render(<MemoryRouter><EjemplaresPage /></MemoryRouter>)
    fireEvent.change(await screen.findByRole('searchbox', { name: 'Código nuevo o placa antigua' }), { target: { value: 'PLACA-55' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir ficha de ARB-0001' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar situación' }))
    fireEvent.change(screen.getByLabelText('Nueva situación'), { target: { value: 'trasladado' } })
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Obras' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar situación' }))
    expect(screen.getByText('Escribe la nueva ubicación o elige un punto en el mapa.')).toBeTruthy()
    expect(cambiarSituacionEjemplar).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Nueva ubicación'), { target: { value: 'Jardín norte' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar situación' }))
    expect(cambiarSituacionEjemplar).toHaveBeenCalledWith(1, expect.objectContaining({
      situacion: 'trasladado', motivo: 'Obras', ubicacion: 'Jardín norte',
    }))
    expect(await screen.findByText('Situación actualizada.')).toBeTruthy()
  })

  it('ordena en una sola cronología eventos del mismo día de distintas fuentes', async () => {
    vi.mocked(listarHistorialEjemplar)
      .mockResolvedValueOnce([{ id: 1, fecha: '2026-10-21', momento: '2026-10-21T08:00:00-05:00', tipo: 'Poda menor', origen: 'Operación de campo', ejecutor: 'Cuadrilla Norte', evidencia_id: 9 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 1, fecha: '2026-10-21', momento: '2026-10-21T12:00:00-05:00', tipo: 'Rama caída', origen: 'Incidencias' }])
    render(<MemoryRouter><EjemplaresPage /></MemoryRouter>)
    fireEvent.change(await screen.findByRole('searchbox', { name: 'Código nuevo o placa antigua' }), { target: { value: 'PLACA-55' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir ficha de ARB-0001' }))

    const cronologia = within(await screen.findByRole('list', { name: 'Cronología de intervenciones' }))
    const eventos = cronologia.getAllByRole('listitem')
    expect(eventos.map((evento) => within(evento).getByText(/Rama caída|Poda menor/).textContent))
      .toEqual(['Rama caída', 'Poda menor'])
    expect(within(eventos[1]).getByText('Ejecutor · Cuadrilla Norte')).toBeTruthy()
    expect(within(eventos[1]).getByRole('link', { name: 'Ver evidencia' }).getAttribute('href'))
      .toBe('/api/v1/core/adjuntos/9/contenido/')
  })
})
