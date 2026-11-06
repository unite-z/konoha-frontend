// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import type { Atencion, ReporteProveedor } from '@/types/tercerizados'
import DialogoReporte from './DialogoReporte'

const adjuntarReporte = vi.fn()
const listarReportes = vi.fn()
const obtenerAtencion = vi.fn()
vi.mock('@/services/api/tercerizados', () => ({
  adjuntarReporte: (...argumentos: unknown[]) => adjuntarReporte(...argumentos),
  listarReportes: (...argumentos: unknown[]) => listarReportes(...argumentos),
  obtenerAtencion: (...argumentos: unknown[]) => obtenerAtencion(...argumentos),
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
  vi.clearAllMocks()
})

const atencion = {
  id: 9,
  estado: 'Ejecutado pendiente de reporte',
  fecha_hora_fin: '2026-01-02T10:00:00-05:00',
  alcances: [],
} as unknown as Atencion

function reporte(cambios: Partial<ReporteProveedor> = {}): ReporteProveedor {
  return {
    id: 70,
    atencion_id: 9,
    revision: 1,
    fecha_recepcion: '2026-01-03',
    resumen: '',
    documentos: [],
    usuario_creacion_id: 1,
    usuario_creacion_nombre: 'Jefe',
    fecha_creacion: '2026-01-03T09:00:00-05:00',
    repetido: false,
    ...cambios,
  }
}

function paginaCon(cantidad: number) {
  return { count: cantidad, next: null, previous: null, results: [] }
}

function montar() {
  const props = { onCerrar: vi.fn(), onActualizada: vi.fn(), onReporteAdjunto: vi.fn(), onExito: vi.fn() }
  render(<DialogoReporte atencion={atencion} abierto {...props} />)
  return props
}

async function elegirArchivo(nombre: string) {
  const usuario = userEvent.setup({ applyAccept: false })
  const entrada = document.querySelector<HTMLInputElement>('input[type="file"]')
  if (!entrada) throw new Error('No se encontró el selector de archivos')
  await usuario.upload(entrada, new File(['%PDF-1.7'], nombre, { type: 'application/pdf' }))
  return usuario
}

describe('DialogoReporte · envío', () => {
  it('adjunta el informe y avisa de la revisión creada', async () => {
    adjuntarReporte.mockResolvedValue(reporte({ revision: 1 }))
    listarReportes.mockResolvedValue(paginaCon(0))
    obtenerAtencion.mockResolvedValue(atencion)
    const props = montar()
    const usuario = await elegirArchivo('informe.pdf')

    await usuario.click(screen.getByRole('button', { name: 'Adjuntar reporte' }))

    await waitFor(() => expect(props.onExito).toHaveBeenCalledWith('Revisión 1 del reporte adjuntada'))
    expect(adjuntarReporte).toHaveBeenCalledTimes(1)
    expect(props.onReporteAdjunto).toHaveBeenCalled()
  })

  it('si el servidor responde que ya estaba registrado, no lo presenta como una revisión nueva', async () => {
    adjuntarReporte.mockResolvedValue(reporte({ revision: 3, repetido: true }))
    listarReportes.mockResolvedValue(paginaCon(3))
    obtenerAtencion.mockResolvedValue(atencion)
    const props = montar()
    const usuario = await elegirArchivo('informe.pdf')

    await usuario.click(screen.getByRole('button', { name: 'Adjuntar reporte' }))

    await waitFor(() =>
      expect(props.onExito).toHaveBeenCalledWith('Este reporte ya estaba registrado como revisión 3; no se creó otra'),
    )
  })

  it('no envía sin un informe final', async () => {
    const props = montar()
    const usuario = await elegirArchivo('fotos-del-jardin.pdf')

    await usuario.click(screen.getByRole('button', { name: 'Adjuntar reporte' }))

    expect(adjuntarReporte).not.toHaveBeenCalled()
    expect(props.onExito).not.toHaveBeenCalled()
  })

  it('no envía dos veces si el formulario se envía otra vez mientras sube', async () => {
    adjuntarReporte.mockReturnValue(new Promise(() => undefined))
    listarReportes.mockResolvedValue(paginaCon(0))
    montar()
    await elegirArchivo('informe.pdf')
    const formulario = document.querySelector('form')
    if (!formulario) throw new Error('No se encontró el formulario')

    // Segundo envío con el formulario ya ocupado (el diálogo y el cerrojo del envío lo ignoran).
    fireEvent.submit(formulario)
    fireEvent.submit(formulario)

    await waitFor(() => expect(adjuntarReporte).toHaveBeenCalledTimes(1))
    await new Promise((resolver) => setTimeout(resolver, 50))
    expect(adjuntarReporte).toHaveBeenCalledTimes(1)
    expect(listarReportes).toHaveBeenCalledTimes(1)
  })
})

describe('DialogoReporte · reintento sin duplicar', () => {
  it('si se pierde la conexión pero la revisión se registró, la da por adjuntada sin reenviar', async () => {
    adjuntarReporte.mockRejectedValue(new ErrorApi(0, null, 'Sin conexión'))
    listarReportes.mockResolvedValueOnce(paginaCon(0)).mockResolvedValueOnce(paginaCon(1))
    obtenerAtencion.mockResolvedValue(atencion)
    const props = montar()
    const usuario = await elegirArchivo('informe.pdf')

    await usuario.click(screen.getByRole('button', { name: 'Adjuntar reporte' }))

    await waitFor(() => expect(props.onExito).toHaveBeenCalledWith('Revisión del reporte adjuntada'))
    expect(adjuntarReporte).toHaveBeenCalledTimes(1)
  })

  it('si se pierde la conexión y no se registró, conserva los archivos para reintentar', async () => {
    adjuntarReporte.mockRejectedValue(new ErrorApi(0, null, 'Sin conexión'))
    listarReportes.mockResolvedValue(paginaCon(0))
    const props = montar()
    const usuario = await elegirArchivo('informe.pdf')

    await usuario.click(screen.getByRole('button', { name: 'Adjuntar reporte' }))

    expect(await screen.findByText('Se perdió la conexión')).toBeTruthy()
    expect(screen.getByText(/La revisión no se registró/)).toBeTruthy()
    expect(screen.getByText('informe.pdf')).toBeTruthy()
    expect(props.onExito).not.toHaveBeenCalled()
  })

  it('si no puede comprobar las revisiones, pide revisar los documentos antes de reintentar', async () => {
    adjuntarReporte.mockRejectedValue(new ErrorApi(0, null, 'Sin conexión'))
    listarReportes.mockRejectedValue(new ErrorApi(0, null, 'Sin conexión'))
    const props = montar()
    const usuario = await elegirArchivo('informe.pdf')

    await usuario.click(screen.getByRole('button', { name: 'Adjuntar reporte' }))

    expect(await screen.findByText('No pudimos confirmar la subida')).toBeTruthy()
    expect(screen.getByText(/Revisa los documentos de la atención antes de reintentar/)).toBeTruthy()
    expect(props.onExito).not.toHaveBeenCalled()
  })

  it('un fallo de almacenamiento (503) no simula éxito y conserva los archivos', async () => {
    adjuntarReporte.mockRejectedValue(new ErrorApi(503, 'AlmacenamientoNoDisponible', 'No se pudo acceder al archivo'))
    listarReportes.mockResolvedValue(paginaCon(0))
    const props = montar()
    const usuario = await elegirArchivo('informe.pdf')

    await usuario.click(screen.getByRole('button', { name: 'Adjuntar reporte' }))

    expect(await screen.findByText('No se pudieron guardar los archivos')).toBeTruthy()
    expect(screen.getByText('informe.pdf')).toBeTruthy()
    expect(props.onExito).not.toHaveBeenCalled()
  })

  it('un 403 informa que falta permiso', async () => {
    adjuntarReporte.mockRejectedValue(new ErrorApi(403, 'SinPermiso', 'Tu usuario no tiene permisos'))
    listarReportes.mockResolvedValue(paginaCon(0))
    montar()
    const usuario = await elegirArchivo('informe.pdf')

    await usuario.click(screen.getByRole('button', { name: 'Adjuntar reporte' }))

    expect(await screen.findByText('Sin permiso')).toBeTruthy()
  })
})
