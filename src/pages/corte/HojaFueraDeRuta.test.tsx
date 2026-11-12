// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import { leerEstadoCola } from '@/sincronizacion/cola'
import HojaFueraDeRuta from './HojaFueraDeRuta'

vi.mock('@/sesion/ContextoSesion', () => ({ useSesionActiva: () => ({ usuario: { id: 4, nombre: 'J. Ramos' } }) }))

const rectorado = { id: 101, codigo: 'J-061', nombre: 'Jardín del Rectorado', zona: 'Rectorado' }
const marcarFueraDeRuta = vi.fn(async () => ({ id: 1, jardin: rectorado, nota: '', marcado_en: '' }))
vi.mock('@/services/api/corte', () => ({
  buscarJardinesFueraDeRuta: async () => ({ count: 1, results: [rectorado] }),
  marcarFueraDeRuta: (...argumentos: unknown[]) => marcarFueraDeRuta(...(argumentos as [])),
}))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false
  }
})
afterEach(cleanup)

describe('HojaFueraDeRuta', () => {
  it('busca el jardín en el maestro y lo marca con nota obligatoria y la clave dada (Figma 375-6772)', async () => {
    const onMarcado = vi.fn()
    render(<HojaFueraDeRuta programacionId={11} clave="clave-1" onCerrar={vi.fn()} onMarcado={onMarcado} />)
    const usuario = userEvent.setup()

    expect(screen.getByRole('button', { name: 'Marcar con nota' }).getAttribute('aria-disabled')).toBe('true')
    await usuario.type(screen.getByRole('combobox', { name: /Jardín/ }), 'Rector')
    await usuario.click(await screen.findByRole('option', { name: /J-061/ }))
    expect(screen.getByText('J-061 · Jardín del Rectorado no está en la ruta de hoy.')).toBeTruthy()

    await usuario.type(screen.getByLabelText(/^Nota/), 'Pedido del jefe de sección')
    await usuario.click(screen.getByRole('button', { name: 'Marcar con nota' }))
    expect(marcarFueraDeRuta).toHaveBeenCalledWith(11, expect.objectContaining({ jardin_id: 101, nota: 'Pedido del jefe de sección' }), 'clave-1')
    expect(onMarcado).toHaveBeenCalledWith(rectorado)
  })

  it('si se corta la red al marcar, la deja en la cola con la misma clave (RF-T-012)', async () => {
    marcarFueraDeRuta.mockRejectedValueOnce(new ErrorApi(0, null, 'sin red'))
    const onMarcado = vi.fn()
    render(<HojaFueraDeRuta programacionId={11} clave="clave-2" onCerrar={vi.fn()} onMarcado={onMarcado} />)
    const usuario = userEvent.setup()
    await usuario.type(screen.getByRole('combobox', { name: /Jardín/ }), 'Rector')
    await usuario.click(await screen.findByRole('option', { name: /J-061/ }))
    await usuario.type(screen.getByLabelText(/^Nota/), 'Pedido del jefe')
    await usuario.click(screen.getByRole('button', { name: 'Marcar con nota' }))
    await vi.waitFor(() => expect(onMarcado).toHaveBeenCalledWith(rectorado))
    expect(leerEstadoCola().pendientes).toEqual([
      expect.objectContaining({ id: 'clave-2', tipo: 'corte.fuera-de-ruta', usuario_id: 4, carga: expect.objectContaining({ programacion_id: 11, jardin_id: 101 }) }),
    ])
  })
})
