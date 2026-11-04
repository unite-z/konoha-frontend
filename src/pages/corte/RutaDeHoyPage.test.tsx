// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import type { JardinRuta, RespuestaRutaDeHoy } from '@/types/corte'
import RutaDeHoyPage from './RutaDeHoyPage'

function jardin(id: number, codigo: string, nombre: string, marcadoEn: string | null = null): JardinRuta {
  return {
    id,
    codigo,
    nombre,
    zona: 'Ciencias',
    estado: marcadoEn ? 'Cortado' : 'Pendiente',
    marcado_en: marcadoEn,
    marcado_por: marcadoEn ? 'J. Ramos' : null,
    detenido_por_interrupcion: false,
  }
}

let respuesta: RespuestaRutaDeHoy
const marcarJardin = vi.fn()
const registrarObservacionJardin = vi.fn(async () => ({ id: 1, texto: '' }))
vi.mock('@/services/api/corte', () => ({
  obtenerRutaDeHoy: async () => respuesta,
  marcarJardin: (...argumentos: unknown[]) => marcarJardin(...argumentos),
  registrarObservacionJardin: (...argumentos: unknown[]) => registrarObservacionJardin(...(argumentos as [])),
}))
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false
  }
})
afterEach(() => {
  cleanup()
  marcarJardin.mockReset()
})

function pintar() {
  respuesta = {
    ruta: {
      programacion_id: 11,
      codigo: 'CC-2026-11',
      servicio: 'Corte de césped',
      jardines: [jardin(1, 'J-015', 'Patio de Física', '2026-11-04T10:18:00-05:00'), jardin(2, 'J-016', 'Talud de Química'), jardin(3, 'J-017', 'Jardín de Ingeniería')],
    },
  }
  render(
    <MemoryRouter>
      <RutaDeHoyPage />
    </MemoryRouter>,
  )
}

describe('RutaDeHoyPage', () => {
  it('muestra el avance y marca un jardín con un toque, con clave de idempotencia (Figma 353-2335)', async () => {
    marcarJardin.mockImplementation(async (_programacion: number, id: number, marcadoEn: string) => ({ ...jardin(id, 'J-016', 'Talud de Química', marcadoEn) }))
    pintar()

    expect(await screen.findByText('1 de 3')).toBeTruthy()
    expect(screen.getByText('Corte de césped · CC-2026-11')).toBeTruthy()
    expect(screen.getByRole('tab', { name: /Por cortar/ }).textContent).toContain('2')

    await userEvent.setup().click(screen.getByRole('button', { name: /^J-016 · Talud de Química, pendiente/ }))
    expect(marcarJardin).toHaveBeenCalledWith(11, 2, expect.any(String), expect.any(String))
    expect(await screen.findByText('2 de 3')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /J-016/ })).toBeNull()
  })

  it('en Marcados, un toque abre «ya está marcado» con quién y cuándo y añade la observación (Figma 375-6817)', async () => {
    pintar()
    const usuario = userEvent.setup()
    await screen.findByText('1 de 3')

    await usuario.click(screen.getByRole('tab', { name: /Marcados/ }))
    await usuario.click(screen.getByRole('button', { name: /^J-015 · Patio de Física, marcado/ }))
    expect(screen.getByRole('dialog', { name: 'J-015 ya está marcado' })).toBeTruthy()
    expect(screen.getByText('Por J. Ramos a las 10:18.')).toBeTruthy()

    await usuario.type(screen.getByLabelText('Observación'), 'Quedó una franja sin cortar')
    await usuario.click(screen.getByRole('button', { name: 'Añadir observación' }))
    expect(registrarObservacionJardin).toHaveBeenCalledWith(11, 1, 'Quedó una franja sin cortar')
    expect(await screen.findByText('Observación añadida a J-015')).toBeTruthy()
  })

  it('si otro ya lo marcó (409 ya-marcado), trae quién y cuándo y abre la hoja', async () => {
    marcarJardin.mockImplementation(async () => {
      respuesta = { ruta: respuesta.ruta && { ...respuesta.ruta, jardines: respuesta.ruta.jardines.map((j) => (j.id === 3 ? jardin(3, 'J-017', 'Jardín de Ingeniería', '2026-11-04T11:02:00-05:00') : j)) } }
      throw new ErrorApi(409, 'ya-marcado', 'J-017 ya estaba marcado')
    })
    pintar()
    await screen.findByText('1 de 3')

    await userEvent.setup().click(screen.getByRole('button', { name: /^J-017 · Jardín de Ingeniería, pendiente/ }))
    expect(await screen.findByRole('dialog', { name: 'J-017 ya está marcado' })).toBeTruthy()
    expect(screen.getByText('Por J. Ramos a las 11:02.')).toBeTruthy()
  })

  it('sin conexión guarda la marca con su hora y su clave y la envía al volver; si ya estaba marcada, lo avisa (Figma 353-2396)', async () => {
    const enLinea = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    marcarJardin.mockImplementation(async (_programacion: number, id: number, marcadoEn: string) => {
      if (id === 3) {
        respuesta = { ruta: respuesta.ruta && { ...respuesta.ruta, jardines: respuesta.ruta.jardines.map((j) => (j.id === 3 ? jardin(3, 'J-017', 'Jardín de Ingeniería', '2026-11-04T11:02:00-05:00') : j)) } }
        throw new ErrorApi(409, 'ya-marcado', 'J-017 ya estaba marcado')
      }
      return jardin(id, 'J-016', 'Talud de Química', marcadoEn)
    })
    pintar()
    const usuario = userEvent.setup()
    await screen.findByText('1 de 3')

    await usuario.click(screen.getByRole('button', { name: /^J-016 · Talud de Química, pendiente/ }))
    await usuario.click(screen.getByRole('button', { name: /^J-017 · Jardín de Ingeniería, pendiente/ }))
    expect(marcarJardin).not.toHaveBeenCalled()
    expect(screen.getByText('Sin conexión · 2 marcas pendientes de enviar')).toBeTruthy()
    expect(screen.getByText('3 de 3')).toBeTruthy()
    expect(screen.getByRole('button', { name: /^J-016 · Talud de Química, sin sincronizar/ }).textContent).toContain('se enviará al tener conexión')

    enLinea.mockReturnValue(true)
    await act(async () => {
      window.dispatchEvent(new Event('online'))
    })
    expect(await screen.findByText('J-017 ya estaba marcado · J. Ramos, 11:02')).toBeTruthy()
    expect(marcarJardin).toHaveBeenCalledTimes(2)
    const [, , horaPrimera, clavePrimera] = marcarJardin.mock.calls[0]
    expect(typeof horaPrimera).toBe('string')
    expect(typeof clavePrimera).toBe('string')
    expect(screen.queryByText(/Sin conexión/)).toBeNull()
    enLinea.mockRestore()
  })

  it('sin corte hoy lo dice', async () => {
    pintar()
    respuesta = { ruta: null }
    cleanup()
    render(
      <MemoryRouter>
        <RutaDeHoyPage />
      </MemoryRouter>,
    )
    expect(await screen.findByText('Hoy no hay corte en tu cuadrilla')).toBeTruthy()
  })
})
