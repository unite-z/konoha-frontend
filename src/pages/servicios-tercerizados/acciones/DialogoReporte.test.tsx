// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import type { Atencion, FormatoReporteAtencion, ReporteProveedor } from '@/types/tercerizados'
import DialogoReporte from './DialogoReporte'

const adjuntarReporte = vi.fn()
const listarReportes = vi.fn()
const obtenerAtencion = vi.fn()
const obtenerFormatoReporte = vi.fn()
vi.mock('@/services/api/tercerizados', () => ({
  adjuntarReporte: (...argumentos: unknown[]) => adjuntarReporte(...argumentos),
  listarReportes: (...argumentos: unknown[]) => listarReportes(...argumentos),
  obtenerAtencion: (...argumentos: unknown[]) => obtenerAtencion(...argumentos),
  obtenerFormatoReporte: (...argumentos: unknown[]) => obtenerFormatoReporte(...argumentos),
}))

const SIN_FORMATO: FormatoReporteAtencion = { formato: null, datos_anteriores: null }

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false
  }
})
beforeEach(() => {
  obtenerFormatoReporte.mockResolvedValue(SIN_FORMATO)
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

function montar(datos = atencion) {
  const props = { onCerrar: vi.fn(), onActualizada: vi.fn(), onReporteAdjunto: vi.fn(), onExito: vi.fn() }
  render(<DialogoReporte atencion={datos} abierto {...props} />)
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
  it('exige una respuesta al subsanar y la envía con la revisión', async () => {
    adjuntarReporte.mockResolvedValue(reporte({ revision: 2 }))
    listarReportes.mockResolvedValue(paginaCon(1))
    obtenerAtencion.mockResolvedValue(atencion)
    montar({ ...atencion, estado: 'Observado' })
    const usuario = await elegirArchivo('informe.pdf')
    const enviar = screen.getByRole('button', { name: 'Registrar subsanación' })
    await usuario.click(enviar)
    expect(adjuntarReporte).not.toHaveBeenCalled()
    const respuesta = screen.getByRole('textbox', { name: /Respuesta a la observación/ })
    expect(document.activeElement).toBe(respuesta)
    await usuario.type(respuesta, 'Corregimos el metrado')
    await usuario.click(enviar)
    await waitFor(() => expect(adjuntarReporte).toHaveBeenCalledTimes(1))
    expect(adjuntarReporte.mock.calls[0][1].resumen).toBe('Corregimos el metrado')
  })

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

describe('DialogoReporte · datos del informe final (RF-SER-009)', () => {
  const conFormato: FormatoReporteAtencion = {
    formato: {
      id: 4,
      version: 2,
      tipo_servicio_id: 3,
      tipo_servicio_nombre: 'Control fitosanitario',
      campos: [
        { nombre_campo: 'Metrado', tipo_dato: 'Decimal', obligatorio: true, orden: 1, subcampos: null },
        {
          nombre_campo: 'Productos aplicados',
          tipo_dato: 'JSON',
          obligatorio: true,
          orden: 2,
          subcampos: [
            { nombre: 'producto', tipo_dato: 'Texto', descripcion: 'Nombre del producto' },
            { nombre: 'cantidad', tipo_dato: 'Decimal', descripcion: 'Cantidad total' },
          ],
        },
        { nombre_campo: 'Ruta recorrida', tipo_dato: 'Texto largo', obligatorio: false, orden: 3, subcampos: null },
      ],
    },
    datos_anteriores: null,
  }

  function preparar(formato: FormatoReporteAtencion = conFormato) {
    obtenerFormatoReporte.mockResolvedValue(formato)
    adjuntarReporte.mockResolvedValue(reporte({ revision: 1 }))
    listarReportes.mockResolvedValue(paginaCon(0))
    obtenerAtencion.mockResolvedValue(atencion)
  }

  it('solo pide los datos cuando hay un «Informe final»', async () => {
    preparar()
    montar()
    await elegirArchivo('fotos-del-jardin.pdf')
    expect(screen.queryByRole('heading', { name: 'Datos del informe final' })).toBeNull()

    await elegirArchivo('informe.pdf')

    expect(await screen.findByRole('heading', { name: 'Datos del informe final' })).toBeTruthy()
    expect(screen.getByText(/Formato estándar de Control fitosanitario · versión 2/)).toBeTruthy()
    expect(screen.getByText('0 de 2 obligatorios')).toBeTruthy()
    expect(obtenerFormatoReporte).toHaveBeenCalledWith(9, expect.any(AbortSignal))
  })

  it('no envía sin los obligatorios, lleva el foco al primero y luego los envía normalizados', async () => {
    preparar()
    const props = montar()
    const usuario = await elegirArchivo('informe.pdf')
    const metrado = await screen.findByRole('textbox', { name: /Metrado/ })

    await usuario.click(screen.getByRole('button', { name: 'Adjuntar reporte' }))

    expect(adjuntarReporte).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(metrado)
    expect(screen.getByText('Completa «Metrado»')).toBeTruthy()
    expect(screen.getByText('Registra al menos una fila de «Productos aplicados»')).toBeTruthy()

    await usuario.type(metrado, '120,5')
    await usuario.type(screen.getByRole('textbox', { name: 'Producto' }), 'Abamectina')
    await usuario.click(screen.getByRole('button', { name: 'Agregar fila a Productos aplicados' }))
    expect(screen.getAllByRole('textbox', { name: 'Producto' })).toHaveLength(2)
    expect(screen.getByText('2 de 2 obligatorios')).toBeTruthy()
    await usuario.click(screen.getByRole('button', { name: 'Adjuntar reporte' }))

    await waitFor(() => expect(props.onExito).toHaveBeenCalled())
    expect(adjuntarReporte.mock.calls[0][1].datos_formato).toEqual({
      Metrado: '120.5',
      'Productos aplicados': [{ producto: 'Abamectina' }],
    })
  })

  it('propone los datos de la revisión anterior', async () => {
    preparar({ ...conFormato, datos_anteriores: { revision: 2, datos: { Metrado: '80', 'Productos aplicados': [{ producto: 'Azufre', cantidad: '3' }] } } })
    montar({ ...atencion, estado: 'Reporte adjunto' })
    await elegirArchivo('informe.pdf')

    expect(await screen.findByText(/Partimos de los datos de la revisión 2/)).toBeTruthy()
    expect((screen.getByRole('textbox', { name: /Metrado/ }) as HTMLInputElement).value).toBe('80')
    expect((screen.getByRole('textbox', { name: 'Producto' }) as HTMLInputElement).value).toBe('Azufre')
    expect(screen.getByText('2 de 2 obligatorios')).toBeTruthy()
  })

  it('sin formato vigente, adjunta el reporte como antes', async () => {
    preparar(SIN_FORMATO)
    const props = montar()
    const usuario = await elegirArchivo('informe.pdf')

    await usuario.click(screen.getByRole('button', { name: 'Adjuntar reporte' }))

    await waitFor(() => expect(props.onExito).toHaveBeenCalled())
    expect(screen.queryByRole('heading', { name: 'Datos del informe final' })).toBeNull()
    expect(adjuntarReporte.mock.calls[0][1].datos_formato).toBeUndefined()
  })

  it('si no puede cargar el formato, avisa y deja adjuntar el reporte sin sus datos', async () => {
    preparar()
    obtenerFormatoReporte.mockRejectedValue(new ErrorApi(503, null, 'Servicio no disponible'))
    const props = montar()
    const usuario = await elegirArchivo('informe.pdf')

    expect(await screen.findByText(/No pudimos cargar el formato estándar del informe final/)).toBeTruthy()
    await usuario.click(screen.getByRole('button', { name: 'Adjuntar reporte' }))

    await waitFor(() => expect(props.onExito).toHaveBeenCalled())
    expect(adjuntarReporte.mock.calls[0][1].datos_formato).toBeUndefined()
  })
})
