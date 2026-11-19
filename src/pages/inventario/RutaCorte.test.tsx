// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import { hoyLima } from '@/utils/instanteLima'
import RutaCortePage from './RutaCortePage'

/** Ruta de jardines del corte de césped (AV-129, RF-INV-004). */

const RETIRO = {
  id: 9,
  area_verde_id: 2,
  area_verde_nombre: 'Patio de Sociales',
  desde: '2026-11-12',
  motivo: 'Obra de la biblioteca',
  autor: 'Jefe de sección',
  fecha_registro: '2026-11-12T15:00:00Z',
  reincorporado_desde: null,
  motivo_reincorporacion: null,
  autor_reincorporacion: null,
}
const RUTA = {
  fecha: '2026-11-12',
  total_jardines: 1,
  superficie_total_m2: '1200.50',
  jardines: [
    {
      area_verde_id: 1,
      nombre: 'Jardín de Sociales',
      sector: 'Sociales',
      a_demanda: false,
      superficie_m2: '1200.50',
      en_ruta: true,
      retiro: null,
    },
    {
      area_verde_id: 2,
      nombre: 'Patio de Sociales',
      sector: 'Sociales',
      a_demanda: false,
      superficie_m2: '300.00',
      en_ruta: false,
      retiro: RETIRO,
    },
    {
      area_verde_id: 3,
      nombre: 'Jardín de la Biblioteca',
      sector: 'Biblioteca',
      a_demanda: true,
      superficie_m2: '80.00',
      en_ruta: false,
      retiro: null,
    },
  ],
}

const api = vi.hoisted(() => ({
  obtenerRutaCorte: vi.fn(),
  listarRetirosRutaCorte: vi.fn(),
  retirarJardinRutaCorte: vi.fn(),
  reincorporarJardinRutaCorte: vi.fn(),
}))
const permiso = vi.hoisted(() => ({ gestionar: true }))
vi.mock('@/services/api/rutaCorte', () => api)
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))
vi.mock('@/sesion/ContextoSesion', () => ({ useSesionActiva: () => ({ usuario: { id: 7 } }) }))
vi.mock('@/config/permisosCore', () => ({
  PERMISOS: { gestionarCatalogos: 'gestionar' },
  puede: () => permiso.gestionar,
}))

// jsdom no implementa showModal ni close.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})
beforeEach(() => {
  permiso.gestionar = true
  api.obtenerRutaCorte.mockResolvedValue(RUTA)
  api.listarRetirosRutaCorte.mockResolvedValue([RETIRO])
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Ruta de jardines del corte de césped', () => {
  it('muestra los jardines, la superficie total y los de sectores a demanda aparte', async () => {
    render(<RutaCortePage />)
    expect(await screen.findByText(/1 jardines en la ruta · superficie total/)).toBeTruthy()
    const ruta = screen.getByRole('table', { name: 'Jardines de la ruta' })
    expect(within(ruta).getByText('Jardín de Sociales')).toBeTruthy()
    expect(within(ruta).getByText('Obra de la biblioteca (desde el 12 nov. 2026)')).toBeTruthy()
    const demanda = screen.getByRole('table', { name: 'Fuera de la ruta: sectores a demanda' })
    expect(within(demanda).getByText('Jardín de la Biblioteca')).toBeTruthy()
    expect(api.obtenerRutaCorte).toHaveBeenCalledWith(hoyLima(), expect.anything())
  })

  it('retira un jardín con motivo y fecha, y no envía sin motivo', async () => {
    api.retirarJardinRutaCorte.mockResolvedValue(RETIRO)
    render(<RutaCortePage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Retirar' }))
    const dialogo = screen.getByRole('dialog')
    const confirmar = within(dialogo).getByRole('button', { name: 'Retirar' })
    fireEvent.click(confirmar)
    expect(await within(dialogo).findByText('Escribe el motivo del retiro.')).toBeTruthy()
    expect(api.retirarJardinRutaCorte).not.toHaveBeenCalled()

    fireEvent.change(document.getElementById('motivo-ruta-corte') as HTMLTextAreaElement, {
      target: { value: ' Obra temporal ' },
    })
    fireEvent.click(confirmar)
    await waitFor(() =>
      expect(api.retirarJardinRutaCorte).toHaveBeenCalledWith({
        area_verde_id: 1,
        desde: hoyLima(),
        motivo: 'Obra temporal',
      }),
    )
    expect(await screen.findByText(/Jardín de Sociales sale de la ruta desde el/)).toBeTruthy()
  })

  it('reincorpora un jardín retirado y muestra el error del backend', async () => {
    api.reincorporarJardinRutaCorte.mockRejectedValue(
      new ErrorApi(400, 'fecha-anterior-al-retiro', 'La reincorporación no puede ser anterior al retiro'),
    )
    render(<RutaCortePage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Reincorporar' }))
    fireEvent.change(document.getElementById('motivo-ruta-corte') as HTMLTextAreaElement, {
      target: { value: 'Terminó la obra' },
    })
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reincorporar' }))
    await waitFor(() => expect(api.reincorporarJardinRutaCorte).toHaveBeenCalledWith(9, expect.anything()))
    expect(await screen.findByText('La reincorporación no puede ser anterior al retiro')).toBeTruthy()
  })

  it('sin permiso para gestionar solo consulta', async () => {
    permiso.gestionar = false
    render(<RutaCortePage />)
    await screen.findByText('Jardín de Sociales')
    expect(screen.queryByRole('button', { name: 'Retirar' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Reincorporar' })).toBeNull()
  })

  it('muestra el acceso denegado si el backend responde 403', async () => {
    api.obtenerRutaCorte.mockRejectedValue(new ErrorApi(403, 'sin-permiso', 'Tu usuario no tiene permisos.'))
    render(<RutaCortePage />)
    expect(await screen.findByText('Tu usuario no tiene permisos.')).toBeTruthy()
  })
})
