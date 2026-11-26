// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import type { Atencion, ReporteProveedor } from '@/types/tercerizados'
import { rutaSubirInforme } from '../enlaces'
import Informes from './Informes'
import { textoAdjuntar } from './textoInformes'

const api = vi.hoisted(() => ({
  adjuntarReporte: vi.fn(),
  listarReportes: vi.fn(),
  obtenerAtencion: vi.fn(),
  obtenerFormatoReporte: vi.fn(),
}))
vi.mock('@/services/api/tercerizados', async (original) => ({
  ...(await original<typeof import('@/services/api/tercerizados')>()),
  ...api,
}))

const REGISTRAR = 'SER.ATENCION.REGISTRAR'

function atencion(estado: string): Atencion {
  return {
    id: 9,
    estado,
    fecha_hora_fin: '2026-01-02T10:00:00-05:00',
    alcances: [],
    conformidades: [],
  } as unknown as Atencion
}

function reporte(revision: number, cambios: Partial<ReporteProveedor> = {}): ReporteProveedor {
  return {
    id: 70 + revision,
    atencion_id: 9,
    revision,
    fecha_recepcion: '2026-01-03',
    resumen: '',
    documentos: [],
    usuario_creacion_id: 1,
    usuario_creacion_nombre: 'Jefe',
    fecha_creacion: '2026-01-03T09:00:00-05:00',
    ...cambios,
  }
}

function pagina(...results: ReporteProveedor[]) {
  return { count: results.length, next: null, previous: null, results }
}

function montar(estado: string, permisos: string[] | null = [REGISTRAR]) {
  const props = { onActualizada: vi.fn(), onReporteAdjunto: vi.fn(), onExito: vi.fn() }
  render(
    <MemoryRouter>
      <Informes atencion={atencion(estado)} permisos={permisos} version={0} {...props} />
    </MemoryRouter>,
  )
  return props
}

async function elegirArchivos(...nombres: string[]) {
  const usuario = userEvent.setup({ applyAccept: false })
  const entrada = document.querySelector<HTMLInputElement>('input[type="file"]')
  if (!entrada) throw new Error('No se encontró el selector de archivos')
  await usuario.upload(
    entrada,
    nombres.map((n) => new File([`%PDF-${n}`], n, { type: 'application/pdf' })),
  )
  return usuario
}

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false
  }
})

beforeEach(() => {
  api.obtenerFormatoReporte.mockResolvedValue({ formato: null, datos_anteriores: null })
  api.obtenerAtencion.mockResolvedValue(atencion('Reporte adjunto'))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Proveedores · informes (RD-54)', () => {
  it('el texto del botón depende del estado', () => {
    expect(textoAdjuntar('Ejecutado pendiente de reporte')).toBe('Adjuntar reporte')
    expect(textoAdjuntar('Observado')).toBe('Subsanar informe')
    expect(textoAdjuntar('Reporte adjunto')).toBe('Adjuntar nueva revisión')
  })

  it('con permiso ofrece «Adjuntar reporte» como acción principal si aún falta el informe', async () => {
    api.listarReportes.mockResolvedValue(pagina())
    montar('Ejecutado pendiente de reporte')
    expect(await screen.findByRole('button', { name: 'Adjuntar reporte' })).toBeTruthy()
  })

  it('con la observación pendiente la acción es «Subsanar informe» y enlaza a subir con la atención elegida', async () => {
    api.listarReportes.mockResolvedValue(pagina(reporte(1)))
    montar('Observado')
    expect(await screen.findByRole('button', { name: 'Subsanar informe' })).toBeTruthy()
    const enlace = screen.getByRole('link', { name: /Subir informe/ })
    expect(enlace.getAttribute('href')).toBe(rutaSubirInforme(9))
  })

  it('sin permiso no ofrece adjuntar pero sí enseña las revisiones', async () => {
    api.listarReportes.mockResolvedValue(pagina(reporte(1)))
    montar('Reporte adjunto', [])
    expect(await screen.findByText('Revisión 1')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Adjuntar|Subsanar/ })).toBeNull()
    expect(screen.queryByRole('link', { name: /Subir informe/ })).toBeNull()
  })

  it('con la atención conforme ya no admite revisiones nuevas', async () => {
    api.listarReportes.mockResolvedValue(pagina(reporte(1)))
    montar('Conforme / cerrado')
    expect(await screen.findByText('Revisión 1')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Adjuntar|Subsanar/ })).toBeNull()
  })

  it('la lista marca la revisión vigente y las anteriores', async () => {
    api.listarReportes.mockResolvedValue(pagina(reporte(2), reporte(1)))
    montar('Reporte adjunto')
    const lista = await screen.findByRole('list', { name: 'Revisiones del informe' })
    const [nueva, vieja] = within(lista).getAllByRole('listitem')
    expect(within(nueva).getByText('Revisión 2')).toBeTruthy()
    expect(within(nueva).getByText('Vigente')).toBeTruthy()
    expect(within(vieja).getByText('Anterior')).toBeTruthy()
  })

  it('sin revisiones muestra el estado vacío', async () => {
    api.listarReportes.mockResolvedValue(pagina())
    montar('Ejecutado pendiente de reporte')
    expect(await screen.findByText('Aún no hay informes')).toBeTruthy()
  })

  it('un error de carga permite reintentar', async () => {
    api.listarReportes.mockRejectedValueOnce(new ErrorApi(500, null, 'Fallo'))
    api.listarReportes.mockResolvedValue(pagina(reporte(1)))
    montar('Reporte adjunto')
    await userEvent.click(await screen.findByRole('button', { name: /reintentar/i }))
    expect(await screen.findByText('Revisión 1')).toBeTruthy()
  })

  it('un 403 del servidor muestra «sin acceso»', async () => {
    api.listarReportes.mockRejectedValue(new ErrorApi(403, null, 'Prohibido'))
    montar('Reporte adjunto')
    expect(await screen.findByText('No puedes ver los informes')).toBeTruthy()
  })

  it('adjunta varios archivos en un solo envío y avisa de la revisión', async () => {
    api.listarReportes.mockResolvedValue(pagina())
    api.adjuntarReporte.mockResolvedValue(reporte(1))
    const props = montar('Ejecutado pendiente de reporte')
    await userEvent.click(await screen.findByRole('button', { name: 'Adjuntar reporte' }))
    const dialogo = await screen.findByRole('dialog')
    const usuario = await elegirArchivos('informe-final.pdf', 'metrado.pdf')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Adjuntar reporte' }))
    await waitFor(() => expect(props.onExito).toHaveBeenCalledWith('Revisión 1 del reporte adjuntada'))
    expect(api.adjuntarReporte).toHaveBeenCalledTimes(1)
    expect(api.adjuntarReporte.mock.calls[0][1].documentos).toHaveLength(2)
    expect(props.onReporteAdjunto).toHaveBeenCalled()
  })

  it('el envío es idempotente: repetir el contenido no crea otra revisión', async () => {
    api.listarReportes.mockResolvedValue(pagina(reporte(1)))
    api.adjuntarReporte.mockResolvedValue(reporte(1, { repetido: true }))
    const props = montar('Reporte adjunto')
    await userEvent.click(await screen.findByRole('button', { name: 'Adjuntar nueva revisión' }))
    const dialogo = await screen.findByRole('dialog')
    const usuario = await elegirArchivos('informe-final.pdf')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Adjuntar nueva revisión' }))
    await waitFor(() =>
      expect(props.onExito).toHaveBeenCalledWith('Este reporte ya estaba registrado como revisión 1; no se creó otra'),
    )
  })
})
