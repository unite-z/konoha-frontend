// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import AtencionEspecialDetallePage from './AtencionEspecialDetallePage'

/** Ficha del ejemplar con atención especial (AV-154, RF-INV-011): quién lo marcó y cancelación con motivo. */

const MARCADO = {
  id: 2,
  ejemplar_id: 4,
  ejemplar_codigo: 'EJ-00734',
  area_verde_id: null,
  area_verde_nombre: null,
  plaga_id: 1,
  plaga_nombre: 'Pulgón',
  aplicaciones_adicionales: 2,
  aplicaciones_realizadas: 0,
  estado: 'En seguimiento',
  fecha_creacion: '2026-11-12T16:25:10Z',
  usuario_creacion_nombre: 'Ingeniero de campo',
  cancelado: false,
  motivo_cancelacion: null,
  fecha_cancelacion: null,
  usuario_cancelacion_id: null,
  usuario_cancelacion_nombre: null,
  aplicaciones: [],
}

const api = vi.hoisted(() => ({ obtenerAtencionEspecial: vi.fn(), cancelarAtencionEspecial: vi.fn() }))
vi.mock('@/services/api/maestrosTercerizados', () => api)
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))
vi.mock('@/sesion/ContextoSesion', () => ({ usePermisos: () => ['SER.ATENCION.REGISTRAR'] }))

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

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function pagina() {
  return render(
    <MemoryRouter initialEntries={['/servicios-tercerizados/control-fitosanitario/2']}>
      <Routes>
        <Route path="/servicios-tercerizados/control-fitosanitario/:id" element={<AtencionEspecialDetallePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Ficha del ejemplar con atención especial', () => {
  it('muestra quién marcó el ejemplar y cuándo', async () => {
    api.obtenerAtencionEspecial.mockResolvedValue(MARCADO)
    pagina()
    expect(await screen.findByText(/Ingeniero de campo · 12 nov/)).toBeTruthy()
  })

  it('no cancela el seguimiento sin motivo y lo envía cuando se escribe', async () => {
    api.obtenerAtencionEspecial.mockResolvedValue(MARCADO)
    api.cancelarAtencionEspecial.mockResolvedValue({
      ...MARCADO,
      cancelado: true,
      estado: 'Cancelado',
      motivo_cancelacion: 'Plaga controlada',
      fecha_cancelacion: '2026-11-12T16:30:00Z',
      usuario_cancelacion_nombre: 'Ingeniero de campo',
    })
    pagina()
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar seguimiento' }))
    const dialogo = screen.getByRole('dialog')
    const confirmar = within(dialogo).getByRole('button', { name: 'Cancelar seguimiento' })

    fireEvent.click(confirmar)
    expect(await within(dialogo).findByText('Escribe el motivo de la cancelación.')).toBeTruthy()
    expect(api.cancelarAtencionEspecial).not.toHaveBeenCalled()

    fireEvent.change(document.getElementById('cancelar-especial-motivo') as HTMLTextAreaElement, {
      target: { value: '  Plaga controlada ' },
    })
    fireEvent.click(confirmar)
    await waitFor(() => expect(api.cancelarAtencionEspecial).toHaveBeenCalledWith(2, { motivo: 'Plaga controlada' }))
    expect(await screen.findByText(/«Plaga controlada»/)).toBeTruthy()
  })
})
