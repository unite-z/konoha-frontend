// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import DialogoReportarIncidencia from './DialogoReportarIncidencia'
import { vaciar } from '@/sincronizacion/almacenLocal'
import { leerEstadoCola, reiniciarColaParaPruebas } from '@/sincronizacion/cola'

const duplicados = vi.fn(async (_tipo: string, _espacio: string, _ejemplar: string | null): Promise<unknown[]> => [])
const registrarIncidencia = vi.fn(async (_cuerpo: unknown, _foto: File | null) => ({ id: 42, codigo: 'INC-2026-042' }))
const sumarReporte = vi.fn(async (_id: number, _descripcion: string, _foto: File | null) => undefined)
vi.mock('@/services/api/incidencias', () => ({
  obtenerCatalogosRegistro: async () => ({
    tipos: ['Rama caída', 'Hojarasca'],
    espacios: [{ nombre: 'Jardín de la Biblioteca', ejemplares: ['T-0412 · Ficus'] }],
    usuarios: [],
    espacio_sugerido: 'Jardín de la Biblioteca',
  }),
  buscarPosiblesDuplicados: (tipo: string, espacio: string, ejemplar: string | null) => duplicados(tipo, espacio, ejemplar),
  registrarIncidencia: (cuerpo: unknown, foto: File | null) => registrarIncidencia(cuerpo, foto),
  sumarReporte: (id: number, descripcion: string, foto: File | null) => sumarReporte(id, descripcion, foto),
}))
vi.mock('@/sesion/ContextoSesion', () => ({ useSesionActiva: () => ({ usuario: { id: 4, nombre: 'J. Ramos' } }) }))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false
  }
})
afterEach(async () => {
  cleanup()
  vi.clearAllMocks()
  reiniciarColaParaPruebas()
  await vaciar('pendientes')
})

const foto = new File(['x'], 'rama.jpg', { type: 'image/jpeg' })

async function rellenar() {
  const usuario = userEvent.setup()
  await usuario.click(await screen.findByRole('radio', { name: 'Rama caída' }))
  await usuario.upload(document.querySelector('input[type="file"]') as HTMLInputElement, foto)
  await usuario.type(screen.getByLabelText('Descripción'), 'Rama sobre el paso peatonal')
  return usuario
}

describe('DialogoReportarIncidencia', () => {
  it('exige tipo y foto y entra con el espacio de la ubicación (Figma 391-8394)', async () => {
    const onEnviado = vi.fn()
    render(<DialogoReportarIncidencia onCerrar={vi.fn()} onEnviado={onEnviado} />)
    const usuario = userEvent.setup()
    await screen.findByRole('radio', { name: 'Rama caída' })
    expect(screen.getByText('Según tu ubicación')).toBeTruthy()

    await usuario.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(screen.getByText('Elige el tipo.')).toBeTruthy()
    expect(screen.getByText('Añade una foto.')).toBeTruthy()

    await rellenar()
    await usuario.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(registrarIncidencia).toHaveBeenCalledWith(
      { canal: 'App', tipo: 'Rama caída', reportado_por: { usuario_id: 4 }, espacio: 'Jardín de la Biblioteca', ejemplar: null, descripcion: 'Rama sobre el paso peatonal' },
      foto,
    )
    expect(onEnviado).toHaveBeenCalledWith('INC-2026-042 reportada')
  })

  it('si ya hay una abierta igual, la añade a la existente (Figma 391-8469)', async () => {
    duplicados.mockResolvedValueOnce([{ id: 41, codigo: 'INC-2026-041', tipo: 'Rama caída', ejemplar: 'T-0412', fecha_registro: new Date(Date.now() - 2.2 * 3_600_000).toISOString() }])
    const onEnviado = vi.fn()
    render(<DialogoReportarIncidencia onCerrar={vi.fn()} onEnviado={onEnviado} />)
    const usuario = await rellenar()
    await usuario.click(screen.getByRole('button', { name: 'Enviar' }))

    const hoja = await screen.findByRole('dialog', { name: 'Ya hay una incidencia abierta' })
    expect(within(hoja).getByText('T-0412 · Rama caída · hace 2 h · INC-2026-041')).toBeTruthy()
    await usuario.click(within(hoja).getByRole('button', { name: 'Añadir a la existente' }))
    expect(sumarReporte).toHaveBeenCalledWith(41, 'Rama sobre el paso peatonal', foto)
    expect(registrarIncidencia).not.toHaveBeenCalled()
    expect(onEnviado).toHaveBeenCalledWith('Añadido a INC-2026-041')
  })

  it('sin conexión lo deja pendiente de enviar (Figma 394-9964)', async () => {
    const enLinea = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const onEnviado = vi.fn()
    render(<DialogoReportarIncidencia onCerrar={vi.fn()} onEnviado={onEnviado} />)
    const usuario = await rellenar()
    await usuario.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(registrarIncidencia).not.toHaveBeenCalled()
    await vi.waitFor(() => expect(onEnviado).toHaveBeenCalledWith('Sin conexión: se enviará al reconectar'))
    const [pendiente] = leerEstadoCola().pendientes
    expect(pendiente).toMatchObject({ tipo: 'incidencia.reporte', usuario_id: 4, archivo: foto })
    expect(pendiente.carga.cuerpo).toMatchObject({ tipo: 'Rama caída', espacio: 'Jardín de la Biblioteca', reportado_en: pendiente.creado_en })
    enLinea.mockRestore()
  })
})
