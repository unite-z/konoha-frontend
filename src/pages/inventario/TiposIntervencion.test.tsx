// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import CatalogosPage from './CatalogosPage'

/** Tarjeta de tipos de intervención tercerizada en Catálogos y sectores (AV-313). */

const TIPOS = [
  { id: 1, nombre: 'Poda de limpieza', descripcion: 'Ramas secas y enfermas', es_poda: true, activo: true, usos: 1 },
  { id: 4, nombre: 'Extracción', descripcion: null, es_poda: false, activo: true, usos: 0 },
  { id: 9, nombre: 'Tala sanitaria', descripcion: null, es_poda: false, activo: false, usos: 3 },
]

const api = vi.hoisted(() => ({
  listarTiposIntervencion: vi.fn(),
  crearTipoIntervencion: vi.fn(),
  cambiarTipoIntervencion: vi.fn(),
}))

vi.mock('@/services/api/catalogosInventario', () => ({
  ...api,
  listarTiposUso: vi.fn().mockResolvedValue([]),
  listarSectores: vi.fn().mockResolvedValue([]),
  listarCuarteles: vi.fn().mockResolvedValue([]),
  listarCapataces: vi.fn().mockResolvedValue([]),
  listarHistorialCapataz: vi.fn(),
  crearTipoUso: vi.fn(),
  cambiarTipoUso: vi.fn(),
  crearSector: vi.fn(),
  cambiarSector: vi.fn(),
  asignarCapataz: vi.fn(),
  crearCuartel: vi.fn(),
  cambiarCuartel: vi.fn(),
}))
vi.mock('@/services/api/mapaAsignaciones', () => ({ listarUsosFuenteMapa: async () => [], clasificarUsoFuenteMapa: vi.fn() }))
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))
vi.mock('@/sesion/ContextoSesion', () => ({ useSesionActiva: () => ({ usuario: { id: 7 } }) }))
vi.mock('@/config/permisosCore', () => ({ PERMISOS: { gestionarCatalogos: 'catalogos' }, puede: () => true }))

function tarjeta() {
  return screen.getByRole('heading', { name: 'Tipos de intervención tercerizada' }).closest('section') ?? document.body
}

beforeEach(() => {
  api.listarTiposIntervencion.mockResolvedValue(TIPOS)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Tipos de intervención tercerizada', () => {
  it('lista los tipos con su alcance, si son poda y cuántas intervenciones tienen', async () => {
    render(<MemoryRouter><CatalogosPage /></MemoryRouter>)

    expect(await screen.findByText('Poda de limpieza')).toBeTruthy()
    expect(screen.getByText('Ramas secas y enfermas · 1 intervención registrada')).toBeTruthy()
    expect(screen.getByText('Sin descripción · 3 intervenciones registradas')).toBeTruthy()
    expect(within(tarjeta()).getByText('Inactivo')).toBeTruthy()
    expect(within(tarjeta()).getByText('Poda')).toBeTruthy()
    expect(api.listarTiposIntervencion).toHaveBeenCalledWith(true, expect.any(AbortSignal))
  })

  it('añade un tipo con su alcance y limpia el formulario', async () => {
    api.crearTipoIntervencion.mockResolvedValue({ id: 10, nombre: 'Poda de formación', descripcion: 'Árboles jóvenes', es_poda: true, activo: true, usos: 0 })
    render(<MemoryRouter><CatalogosPage /></MemoryRouter>)
    await screen.findByText('Poda de limpieza')

    const nombre = screen.getByLabelText(/^Nombre/, { selector: '#nuevo-tipo-intervencion' }) as HTMLInputElement
    fireEvent.change(nombre, { target: { value: '  Poda de formación ' } })
    fireEvent.change(screen.getByLabelText(/Descripción o alcance/), { target: { value: 'Árboles jóvenes' } })
    fireEvent.click(screen.getByLabelText(/Es una poda/))
    fireEvent.submit(nombre.closest('form') as HTMLFormElement)

    expect(await screen.findByText('Tipo de intervención creado.')).toBeTruthy()
    expect(api.crearTipoIntervencion).toHaveBeenCalledWith({ nombre: 'Poda de formación', descripcion: 'Árboles jóvenes', es_poda: true })
    expect(nombre.value).toBe('')
    expect(api.listarTiposIntervencion).toHaveBeenCalledTimes(2)
  })

  it('desactiva y activa sin borrar', async () => {
    api.cambiarTipoIntervencion.mockResolvedValue(TIPOS[1])
    render(<MemoryRouter><CatalogosPage /></MemoryRouter>)
    await screen.findByText('Poda de limpieza')

    const botones = within(tarjeta()).getAllByRole('button', { name: /Desactivar|Activar/ })
    fireEvent.click(botones[1] as HTMLElement)
    expect(await screen.findByText('Tipo de intervención desactivado.')).toBeTruthy()
    expect(api.cambiarTipoIntervencion).toHaveBeenCalledWith(4, { activo: false })

    fireEvent.click(within(tarjeta()).getByRole('button', { name: 'Activar' }))
    expect(await screen.findByText('Tipo de intervención activado.')).toBeTruthy()
    expect(api.cambiarTipoIntervencion).toHaveBeenLastCalledWith(9, { activo: true })
    expect(within(tarjeta()).queryByRole('button', { name: /Eliminar|Borrar/ })).toBeNull()
  })

  it('muestra el duplicado del backend y el error de carga', async () => {
    api.crearTipoIntervencion.mockRejectedValue(new ErrorApi(409, 'tipo-duplicado', 'Ya existe un tipo de intervención con ese nombre'))
    render(<MemoryRouter><CatalogosPage /></MemoryRouter>)
    await screen.findByText('Poda de limpieza')

    const nombre = screen.getByLabelText(/^Nombre/, { selector: '#nuevo-tipo-intervencion' })
    fireEvent.change(nombre, { target: { value: 'extracción' } })
    fireEvent.submit(nombre.closest('form') as HTMLFormElement)
    expect(await screen.findByText('Ya existe un tipo de intervención con ese nombre')).toBeTruthy()
    cleanup()

    api.listarTiposIntervencion.mockRejectedValue(new ErrorApi(500, null, 'Fallo del servidor'))
    render(<MemoryRouter><CatalogosPage /></MemoryRouter>)
    expect(await screen.findByText('No se pudieron cargar los tipos de intervención')).toBeTruthy()
  })
})
