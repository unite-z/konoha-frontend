// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '../../services/api/cliente'
import type { Importacion } from '../../types/core'
import ImportacionPage from './ImportacionPage'

const api = vi.hoisted(() => ({
  validarImportacion: vi.fn(),
  confirmarImportacion: vi.fn(),
  listarFilasImportacion: vi.fn(),
}))
vi.mock('../../services/api/core', () => api)
vi.mock('../../hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))

const VALIDADA: Importacion = {
  id: 7,
  tipo: 'catastro',
  archivo: 'catastro.xlsx',
  estado: 'Validada',
  total: 4,
  altas: 2,
  actualizaciones: 1,
  sin_cambios: 0,
  revisar: 0,
  errores: 1,
  usuario: 'Jefe de prueba',
  fecha_creacion: '2026-11-03T10:00:00-05:00',
  fecha_confirmacion: null,
}

function pintar() {
  render(
    <MemoryRouter>
      <ImportacionPage />
    </MemoryRouter>,
  )
}

async function elegirArchivo(usuario: ReturnType<typeof userEvent.setup>) {
  const entrada = document.querySelector('input[type="file"]')
  if (!(entrada instanceof HTMLInputElement)) throw new Error('Falta el selector de archivo')
  await usuario.upload(entrada, new File(['x'], 'catastro.xlsx'))
}

beforeEach(() => {
  Object.values(api).forEach((funcion) => funcion.mockReset())
  api.listarFilasImportacion.mockResolvedValue({
    count: 1,
    next: null,
    previous: null,
    results: [{ fila: 2, codigo: null, resultado: 'Error', detalle: 'Falta especie' }],
  })
})

afterEach(cleanup)

describe('ImportacionPage', () => {
  it('valida, muestra el informe y confirma solo tras revisarlo', async () => {
    const usuario = userEvent.setup()
    api.validarImportacion.mockResolvedValue(VALIDADA)
    api.confirmarImportacion.mockResolvedValue({
      ...VALIDADA,
      estado: 'Confirmada',
      fecha_confirmacion: '2026-11-03T10:05:00-05:00',
    })
    pintar()

    await elegirArchivo(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Validar archivo' }))

    expect(await screen.findByText('Falta especie')).toBeTruthy()
    expect(screen.getByText('Los registros con errores o por revisar no se incorporarán.')).toBeTruthy()
    expect(api.validarImportacion).toHaveBeenCalledWith('catastro', expect.any(File))
    expect(api.confirmarImportacion).not.toHaveBeenCalled()

    await usuario.click(screen.getByRole('button', { name: 'Confirmar registros válidos' }))

    expect(await screen.findByText('Importación finalizada')).toBeTruthy()
    expect(api.confirmarImportacion).toHaveBeenCalledWith(7)
    expect(screen.getByText('Jefe de prueba')).toBeTruthy()
  })

  it('sin archivo no se puede validar', async () => {
    const usuario = userEvent.setup()
    pintar()

    await usuario.click(screen.getByRole('button', { name: 'Validar archivo' }))

    expect(api.validarImportacion).not.toHaveBeenCalled()
  })

  it('sin registros válidos no se puede confirmar', async () => {
    const usuario = userEvent.setup()
    api.validarImportacion.mockResolvedValue({ ...VALIDADA, altas: 0, actualizaciones: 0 })
    pintar()

    await elegirArchivo(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Validar archivo' }))
    await usuario.click(await screen.findByRole('button', { name: 'Confirmar registros válidos' }))

    expect(api.confirmarImportacion).not.toHaveBeenCalled()
  })

  it('muestra el error del backend y conserva el archivo para reintentar', async () => {
    const usuario = userEvent.setup()
    api.validarImportacion.mockRejectedValue(new ErrorApi(400, 'columnas-faltantes', 'Faltan las columnas: especie'))
    pintar()

    await elegirArchivo(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Validar archivo' }))

    expect(await screen.findByText('Faltan las columnas: especie')).toBeTruthy()
    await waitFor(() => expect(screen.getByText('Archivo elegido: catastro.xlsx')).toBeTruthy())
  })

  it('«Cambiar archivo» vuelve a la carga sin confirmar nada', async () => {
    const usuario = userEvent.setup()
    api.validarImportacion.mockResolvedValue(VALIDADA)
    pintar()

    await elegirArchivo(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Validar archivo' }))
    await usuario.click(await screen.findByRole('button', { name: 'Cambiar archivo' }))

    expect(screen.getByRole('button', { name: 'Validar archivo' })).toBeTruthy()
    expect(api.confirmarImportacion).not.toHaveBeenCalled()
  })
})
