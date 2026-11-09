// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import EjemplaresPage from './EjemplaresPage'
import { listarAdjuntos, subirAdjunto } from '@/services/api/core'
import type { Adjunto } from '@/types/core'
import { cambiarSituacionEjemplar, guardarAlturaEjemplar, listarHistorialEjemplar, vincularEjemplarConArea } from '@/services/api/ejemplares'

const { listarEjemplares, alturas } = vi.hoisted(() => {
  const alturas = new Map<number, number>()
  return { alturas, listarEjemplares: vi.fn(async (q = '', pagina = 1) => {
  const ejemplares = [
    { id: 1, codigo: 'ARB-0001', codigo_placa_antigua: 'PLACA-55', especie_nombre_comun: 'Molle', especie_nombre_cientifico: 'Schinus molle', especie_forma_biologica: 'Árbol', referencia_catastro: null, codigo_catastro: null, tipo_vegetacion: null, ubicacion: 'Parque', latitud: -12.1, longitud: -77.1, cantidad: 1, area_verde_id: null, especie_id: 1, advertencia_placa_repetida: true },
    { id: 2, codigo: 'ARB-0002', codigo_placa_antigua: 'PLACA-55', especie_nombre_comun: 'Molle', especie_nombre_cientifico: 'Schinus molle', especie_forma_biologica: 'Árbol', referencia_catastro: 'Plano 2', codigo_catastro: 'CAT-22', tipo_vegetacion: null, ubicacion: 'Parque', latitud: null, longitud: null, cantidad: 1, area_verde_id: null, especie_id: 1, advertencia_placa_repetida: true },
  ]
    const resultados = q === 'Schinus molle'
      ? pagina === 1
        ? Array.from({ length: 25 }, (_, i) => ({ ...ejemplares[0], id: i + 100, codigo: `OTRO-${i + 1}`, especie_id: 9 }))
        : pagina === 2 ? [ejemplares[1]] : []
      : q === 'CATALOGO'
      ? pagina === 1 ? Array.from({ length: 25 }, (_, i) => ({ ...ejemplares[0], id: i + 100, codigo: `CAT-${i + 1}` })) : pagina === 2 ? [ejemplares[1]] : []
      : !q ? [ejemplares[0]] : q === 'PLACA-55' ? ejemplares : []
    return resultados.map((ejemplar) => ({ ...ejemplar, altura_total_m: alturas.get(ejemplar.id) ?? null }))
  }) }
})

vi.mock('@/services/api/ejemplares', () => ({
  EJEMPLARES_POR_PAGINA: 25,
  listarEjemplares,
  listarEspecies: async (incluirInactivas: boolean) => [
    { id: 1, nombre_comun: 'Molle', nombre_cientifico: 'Schinus molle', forma_biologica: 'Árbol', activo: true },
    ...(incluirInactivas ? [{ id: 3, nombre_comun: 'Ciprés', nombre_cientifico: 'Cupressus sempervirens', forma_biologica: 'Árbol', activo: false }] : []),
  ],
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
vi.mock('@/services/api/core', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/services/api/core')>(),
  listarAdjuntos: vi.fn(async (): Promise<Adjunto[]> => []),
  subirAdjunto: vi.fn(),
}))
vi.mock('@/services/api/mapaAsignaciones', () => ({
  listarTodasLasAreasVerdes: async () => [{ id: 42, nombre: 'Bosque Húmedo', lugar: 'Campus' }],
}))
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))
vi.mock('@/sesion/ContextoSesion', () => ({ useSesionActiva: () => ({ usuario: { id: 7 }, roles: ['Jefe de sección'] }) }))
vi.mock('@/config/permisosCore', () => ({ PERMISOS: { registrarInventario: 'registrar', gestionarCatalogos: 'gestionar' }, puede: () => true }))
vi.mock('@/layouts/LayoutOficina/AccionesPagina', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.open = true }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.open = false }
})

afterEach(() => {
  cleanup()
  listarEjemplares.mockClear()
  alturas.clear()
  vi.mocked(listarAdjuntos).mockReset()
  vi.mocked(listarAdjuntos).mockResolvedValue([])
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
    expect(screen.queryByRole('button', { name: 'Añadir especie' })).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Especies' }))
    expect(screen.queryByRole('searchbox', { name: 'Código nuevo o placa antigua' })).toBeNull()
    expect(screen.getByRole('searchbox', { name: 'Buscar especie' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Añadir especie' }))
    const formulario = await screen.findByRole('dialog', { name: 'Añadir especie' })
    expect(within(formulario).getByLabelText('Nombre científico')).toHaveProperty('required', true)
  })

  it('filtra el catálogo y abre solo los ejemplares de la especie elegida', async () => {
    render(<MemoryRouter><EjemplaresPage /></MemoryRouter>)
    fireEvent.click(screen.getByRole('tab', { name: 'Especies' }))
    const nombreCientifico = await screen.findByText('Schinus molle')
    const fichaEspecie = within(screen.getByRole('listitem', { name: '' }))
    expect(fichaEspecie.getByText('Nombre común').nextElementSibling?.textContent).toBe('Molle')
    expect(fichaEspecie.getByText('Nombre científico').nextElementSibling).toBe(nombreCientifico.parentElement)
    expect(fichaEspecie.getByText('Forma biológica').nextElementSibling?.textContent).toBe('Árbol')
    expect(screen.queryByText('Ciprés')).toBeNull()

    fireEvent.change(screen.getByRole('combobox', { name: 'Estado' }), { target: { value: 'inactivas' } })
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar especie' }), { target: { value: 'cipres' } })
    expect(screen.getByText('Ciprés')).toBeTruthy()
    expect(screen.queryByText('Molle')).toBeNull()

    fireEvent.change(screen.getByRole('combobox', { name: 'Estado' }), { target: { value: 'activas' } })
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar especie' }), { target: { value: 'schinus' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ver ejemplares de Molle' }))
    expect(await screen.findByRole('button', { name: 'Abrir ficha de ARB-0002' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Abrir ficha de OTRO/ })).toBeNull()
    expect(screen.getByText('Especie: Molle')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtro de especie' }))
    expect(await screen.findByRole('button', { name: 'Abrir ficha de ARB-0001' })).toBeTruthy()
  })

  it('pagina las coincidencias y conserva la página al cambiar a galería', async () => {
    render(<MemoryRouter><EjemplaresPage /></MemoryRouter>)
    fireEvent.change(await screen.findByRole('searchbox'), { target: { value: 'CATALOGO' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Siguiente' }))
    expect(await screen.findByRole('button', { name: 'Abrir ficha de ARB-0002' })).toBeTruthy()
    expect(screen.getByText('Página 2')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Siguiente' }).getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Galería' }))
    expect(await screen.findByText('Sin foto registrada')).toBeTruthy()
    expect(screen.getByText('Página 2')).toBeTruthy()
  })

  it('adjunta una foto desde la ficha y actualiza la vista previa y la galería', async () => {
    const foto: Adjunto = {
      id: 12, uuid_cliente: 'foto', entidad: 'ejemplar', registro_id: 1,
      nombre: 'molle.png', tipo_mime: 'image/png', tamano_bytes: 4,
      descripcion: null, usuario: 'Equipo', fecha_creacion: '2026-11-09T08:00:00-05:00',
    }
    vi.mocked(subirAdjunto).mockImplementationOnce(async () => {
      vi.mocked(listarAdjuntos).mockResolvedValue([foto])
      return foto
    })
    render(<MemoryRouter><EjemplaresPage /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir ficha de ARB-0001' }))
    const ficha = within(screen.getByRole('group', { name: 'Ficha de ARB-0001' }))
    expect(await ficha.findByText('Sin foto registrada')).toBeTruthy()
    const campo = ficha.getByRole('button', { name: 'Seleccionar archivos' }).parentElement?.querySelector('input[type="file"]')
    if (!campo) throw new Error('Falta el campo de fotografía')
    const archivo = new File(['foto'], foto.nombre, { type: foto.tipo_mime })
    fireEvent.change(campo, { target: { files: [archivo] } })
    expect(await ficha.findByRole('img', { name: 'Fotografía de ARB-0001' })).toHaveProperty('src', expect.stringContaining('/adjuntos/12/contenido/'))
    expect(subirAdjunto).toHaveBeenCalledWith('ejemplar', 1, archivo, expect.any(String))
    fireEvent.click(ficha.getByRole('button', { name: 'Cerrar ficha' }))
    fireEvent.click(screen.getByRole('button', { name: 'Galería' }))
    expect(await screen.findByRole('img', { name: 'Fotografía de ARB-0001' })).toBeTruthy()
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
