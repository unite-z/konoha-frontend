// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import DialogoRegistrarIncidencia from './DialogoRegistrarIncidencia'

const registrarIncidencia = vi.fn(async (_cuerpo: unknown, _foto: File | null) => ({ id: 42, codigo: 'INC-2026-042' }))
vi.mock('@/services/api/incidencias', () => ({
  obtenerCatalogosRegistro: async () => ({
    tipos: ['Rama caída', 'Hojarasca'],
    espacios: [{ nombre: 'Estacionamiento 3', ejemplares: ['T-0907 · Eucalipto'] }],
    usuarios: [{ id: 1, nombre: 'Ana Q.' }],
  }),
  registrarIncidencia: (cuerpo: unknown, foto: File | null) => registrarIncidencia(cuerpo, foto),
}))

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
  registrarIncidencia.mockClear()
})

describe('DialogoRegistrarIncidencia', () => {
  it('registra una incidencia telefónica de una persona externa con su foto (Figma 394-8504)', async () => {
    const onRegistrada = vi.fn()
    render(<DialogoRegistrarIncidencia onCerrar={vi.fn()} onRegistrada={onRegistrada} />)
    const usuario = userEvent.setup()
    await screen.findByRole('option', { name: 'Rama caída' })

    await usuario.click(screen.getByRole('button', { name: 'Registrar' }))
    expect(screen.getByText('Elige el tipo.')).toBeTruthy()
    expect(screen.getByText('Escribe el nombre.')).toBeTruthy()
    expect(registrarIncidencia).not.toHaveBeenCalled()

    await usuario.selectOptions(screen.getByLabelText(/^Tipo/), 'Rama caída')
    await usuario.type(screen.getByLabelText(/^Nombre/), 'Vigilante · Puerta 3')
    await usuario.type(screen.getByLabelText('Contacto'), '987 654 321')
    await usuario.selectOptions(screen.getByLabelText(/^Espacio/), 'Estacionamiento 3')
    await usuario.selectOptions(screen.getByLabelText('Ejemplar'), 'T-0907 · Eucalipto')
    await usuario.type(screen.getByLabelText(/^Descripción/), 'Rama sobre la vía de salida')
    const foto = new File(['x'], 'rama.jpg', { type: 'image/jpeg' })
    await usuario.upload(document.querySelector('input[type="file"]') as HTMLInputElement, foto)
    expect(screen.getByText('rama.jpg')).toBeTruthy()

    await usuario.click(screen.getByRole('button', { name: 'Registrar' }))
    expect(registrarIncidencia).toHaveBeenCalledWith(
      {
        canal: 'Telefono',
        tipo: 'Rama caída',
        reportado_por: { nombre: 'Vigilante · Puerta 3', contacto: '987 654 321' },
        espacio: 'Estacionamiento 3',
        ejemplar: 'T-0907 · Eucalipto',
        descripcion: 'Rama sobre la vía de salida',
      },
      foto,
    )
    expect(onRegistrada).toHaveBeenCalled()
  })

  it('con un usuario del sistema, lo elige de la lista', async () => {
    render(<DialogoRegistrarIncidencia onCerrar={vi.fn()} onRegistrada={vi.fn()} />)
    const usuario = userEvent.setup()
    await screen.findByRole('option', { name: 'Rama caída' })

    await usuario.click(screen.getByRole('radio', { name: 'Usuario del sistema' }))
    expect(screen.queryByLabelText(/^Nombre/)).toBeNull()
    await usuario.selectOptions(screen.getByLabelText(/^Tipo/), 'Hojarasca')
    await usuario.selectOptions(screen.getByRole('combobox', { name: /^Usuario/ }), '1')
    await usuario.selectOptions(screen.getByLabelText(/^Espacio/), 'Estacionamiento 3')
    await usuario.type(screen.getByLabelText(/^Descripción/), 'Hojas en la vía')
    await usuario.click(screen.getByRole('button', { name: 'Registrar' }))
    expect(registrarIncidencia).toHaveBeenCalledWith(expect.objectContaining({ reportado_por: { usuario_id: 1 }, ejemplar: null }), null)
  })
})
