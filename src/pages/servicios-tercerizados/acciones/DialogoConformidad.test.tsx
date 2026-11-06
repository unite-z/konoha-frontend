// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import type { Atencion, Conformidad } from '@/types/tercerizados'
import DialogoConformidad from './DialogoConformidad'

const registrarConformidad = vi.fn()
const obtenerAtencion = vi.fn()
vi.mock('@/services/api/tercerizados', () => ({
  registrarConformidad: (...argumentos: unknown[]) => registrarConformidad(...argumentos),
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

function atencionCon(cambios: Partial<Atencion> = {}) {
  return {
    id: 9,
    estado: 'Reporte adjunto',
    origen: 'Demanda',
    fecha_hora_fin: '2026-01-02T10:00:00-05:00',
    conformidades: [],
    ...cambios,
  } as unknown as Atencion
}

function decision(cambios: Partial<Conformidad> = {}): Conformidad {
  return {
    id: 1,
    resultado: 'Observada',
    fecha_conformidad: '2026-01-05',
    comentarios: 'Falta el metrado',
    revision: 1,
    usuario_id: 1,
    usuario_nombre: 'Jefe',
    fecha_creacion: '2026-01-05T09:00:00-05:00',
    ...cambios,
  }
}

function montar(atencion = atencionCon()) {
  const props = { onCerrar: vi.fn(), onActualizada: vi.fn(), onExito: vi.fn() }
  render(<DialogoConformidad atencion={atencion} abierto {...props} />)
  return { props, usuario: userEvent.setup() }
}

const registrar = () => screen.getByRole('button', { name: 'Registrar decisión' })

describe('DialogoConformidad · validación', () => {
  it('no envía sin elegir una decisión', async () => {
    const { usuario } = montar()
    await usuario.click(registrar())

    expect(await screen.findByText('Elige si das la conformidad u observas el informe')).toBeTruthy()
    expect(registrarConformidad).not.toHaveBeenCalled()
  })

  it('al observar exige decir qué corregir', async () => {
    const { usuario } = montar()
    await usuario.click(screen.getByRole('radio', { name: /Observar el informe/ }))
    await usuario.click(registrar())

    expect(await screen.findByText('Anota qué debe corregir el proveedor en el informe')).toBeTruthy()
    expect(registrarConformidad).not.toHaveBeenCalled()
  })

  it('la conformidad no pide comentarios', async () => {
    registrarConformidad.mockResolvedValue(atencionCon({ estado: 'Conforme / cerrado', conformidades: [decision({ resultado: 'Conforme' })] }))
    const { usuario } = montar()
    await usuario.click(screen.getByRole('radio', { name: /Dar la conformidad/ }))
    await usuario.click(registrar())

    await waitFor(() => expect(registrarConformidad).toHaveBeenCalledTimes(1))
  })

  it('avisa que el acuerdo de la unidad es aparte cuando la atención la pidió una unidad', () => {
    montar(atencionCon({ origen: 'SolicitudUnidad' }))
    expect(screen.getByText(/acuerdo de la unidad solicitante se registra aparte/i)).toBeTruthy()
  })
})

describe('DialogoConformidad · envío', () => {
  it('observa el informe y avisa que la atención queda observada', async () => {
    const actualizada = atencionCon({ estado: 'Observado', conformidades: [decision()] })
    registrarConformidad.mockResolvedValue(actualizada)
    const { props, usuario } = montar()

    await usuario.click(screen.getByRole('radio', { name: /Observar el informe/ }))
    await usuario.type(screen.getByLabelText(/Qué debe corregir el proveedor/), '  Falta el metrado  ')
    await usuario.click(registrar())

    await waitFor(() => expect(props.onExito).toHaveBeenCalledWith('Observación registrada. La atención quedó observada, a la espera de una nueva revisión.'))
    expect(registrarConformidad).toHaveBeenCalledWith(9, {
      resultado: 'Observada',
      fecha_conformidad: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      comentarios: 'Falta el metrado',
    })
    expect(props.onActualizada).toHaveBeenCalledWith(actualizada)
  })

  it('da la conformidad y avisa que la atención quedó cerrada', async () => {
    registrarConformidad.mockResolvedValue(atencionCon({ estado: 'Conforme / cerrado', conformidades: [decision({ resultado: 'Conforme' })] }))
    const { props, usuario } = montar()

    await usuario.click(screen.getByRole('radio', { name: /Dar la conformidad/ }))
    await usuario.click(registrar())

    await waitFor(() => expect(props.onExito).toHaveBeenCalledWith('Conformidad registrada. La atención quedó cerrada como conforme.'))
    expect(registrarConformidad).toHaveBeenCalledWith(9, expect.objectContaining({ resultado: 'Conforme', comentarios: '' }))
  })

  it('no envía dos veces si el formulario se envía otra vez mientras se registra', async () => {
    registrarConformidad.mockReturnValue(new Promise(() => undefined))
    const { usuario } = montar()
    await usuario.click(screen.getByRole('radio', { name: /Dar la conformidad/ }))
    const formulario = document.querySelector('form')
    if (!formulario) throw new Error('No se encontró el formulario')

    fireEvent.submit(formulario)
    fireEvent.submit(formulario)

    await waitFor(() => expect(registrarConformidad).toHaveBeenCalledTimes(1))
    await new Promise((resolver) => setTimeout(resolver, 50))
    expect(registrarConformidad).toHaveBeenCalledTimes(1)
  })

  it('si se pierde la conexión pero la decisión quedó registrada, la da por hecha sin reenviar', async () => {
    registrarConformidad.mockRejectedValue(new ErrorApi(0, null, 'Sin conexión'))
    obtenerAtencion.mockResolvedValue(atencionCon({ estado: 'Conforme / cerrado', conformidades: [decision({ resultado: 'Conforme' })] }))
    const { props, usuario } = montar()

    await usuario.click(screen.getByRole('radio', { name: /Dar la conformidad/ }))
    await usuario.click(registrar())

    await waitFor(() => expect(props.onExito).toHaveBeenCalled())
    expect(registrarConformidad).toHaveBeenCalledTimes(1)
  })

  it('si la atención cambió de estado (409) no da nada por hecho', async () => {
    registrarConformidad.mockRejectedValue(new ErrorApi(409, null, 'Operación no permitida desde Observado'))
    obtenerAtencion.mockResolvedValue(atencionCon({ estado: 'Observado' }))
    const { props, usuario } = montar()

    await usuario.click(screen.getByRole('radio', { name: /Dar la conformidad/ }))
    await usuario.click(registrar())

    await waitFor(() => expect(props.onActualizada).toHaveBeenCalled())
    expect(props.onExito).not.toHaveBeenCalled()
  })
})
