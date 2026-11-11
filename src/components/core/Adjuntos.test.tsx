// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { descargarAdjunto, listarAdjuntos, subirAdjunto } from '@/services/api/core'
import Adjuntos from './Adjuntos'

vi.mock('@/sesion/ContextoSesion', () => ({ useSesionActiva: () => ({ usuario: { id: 4, nombre: 'J. Ramos' } }) }))

vi.mock('@/services/api/core', () => ({
  listarAdjuntos: vi.fn(async () => []),
  subirAdjunto: vi.fn(async () => ({ id: 1 })),
  descargarAdjunto: vi.fn(),
}))

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function () { this.open = true }
  HTMLDialogElement.prototype.close ??= function () { this.open = false }
})

beforeEach(() => {
  vi.mocked(listarAdjuntos).mockResolvedValue([])
  vi.mocked(subirAdjunto).mockClear()
  vi.mocked(descargarAdjunto).mockReset()
  vi.stubGlobal('crypto', { randomUUID: vi.fn(() => `clave-${Math.random()}`) })
  vi.stubGlobal('URL', Object.assign(URL, {
    createObjectURL: vi.fn(() => `blob:foto-${Math.random()}`),
    revokeObjectURL: vi.fn(),
  }))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function cargar(nombre = 'jardin.jpg', tipo = 'image/jpeg') {
  const entrada = document.querySelector('input[type="file"]') as HTMLInputElement
  const archivo = new File(['foto'], nombre, { type: tipo })
  fireEvent.change(entrada, { target: { files: [archivo] } })
  return archivo
}

describe('Adjuntos con confirmación previa', () => {
  it('muestra, quita y permite volver a seleccionar un archivo sin subirlo', async () => {
    render(
      <Adjuntos entidad="actividad" registroId={7} puedeAdjuntar confirmarSeleccion tiposAceptados=".jpg,.jpeg,.png" />,
    )

    cargar()
    expect(await screen.findByText('Fotografías pendientes de guardar')).toBeTruthy()
    expect(screen.getByText('jardin.jpg')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Vista previa de jardin.jpg' })).toBeTruthy()
    expect(subirAdjunto).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Vista previa de jardin.jpg' }))
    expect(screen.getByRole('img', { name: 'Vista ampliada de jardin.jpg' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

    fireEvent.click(screen.getByRole('button', { name: 'Quitar' }))
    expect(screen.queryByText('jardin.jpg')).toBeNull()
    expect(URL.revokeObjectURL).toHaveBeenCalled()

    cargar()
    expect(await screen.findByText('jardin.jpg')).toBeTruthy()
    expect(subirAdjunto).not.toHaveBeenCalled()
  })

  it('sube todos los archivos solo al confirmar y limpia los pendientes guardados', async () => {
    render(
      <Adjuntos entidad="actividad" registroId={7} puedeAdjuntar confirmarSeleccion tiposAceptados=".jpg,.jpeg,.png" />,
    )
    const entrada = document.querySelector('input[type="file"]') as HTMLInputElement
    const archivos = [
      new File(['uno'], 'uno.jpg', { type: 'image/jpeg' }),
      new File(['dos'], 'dos.png', { type: 'image/png' }),
    ]
    fireEvent.change(entrada, { target: { files: archivos } })

    fireEvent.click(await screen.findByRole('button', { name: 'Guardar archivos' }))

    await waitFor(() => expect(subirAdjunto).toHaveBeenCalledTimes(2))
    expect(subirAdjunto).toHaveBeenNthCalledWith(1, 'actividad', 7, archivos[0], expect.any(String))
    expect(subirAdjunto).toHaveBeenNthCalledWith(2, 'actividad', 7, archivos[1], expect.any(String))
    await waitFor(() => expect(screen.queryByText('Fotografías pendientes de guardar')).toBeNull())
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2)
  })

  it('rechaza el formato antes de incorporarlo a la selección', async () => {
    render(
      <Adjuntos entidad="actividad" registroId={7} puedeAdjuntar confirmarSeleccion tiposAceptados=".jpg,.jpeg,.png" />,
    )

    cargar('notas.txt', 'text/plain')

    expect(await screen.findByText('notas.txt no tiene un formato admitido.')).toBeTruthy()
    expect(screen.queryByText('Fotografías pendientes de guardar')).toBeNull()
    expect(subirAdjunto).not.toHaveBeenCalled()
  })

  it('mantiene la miniatura y muestra el error cuando falla el guardado', async () => {
    vi.mocked(subirAdjunto).mockRejectedValueOnce(new Error('Almacenamiento no disponible'))
    render(
      <Adjuntos entidad="actividad" registroId={7} puedeAdjuntar confirmarSeleccion tiposAceptados=".jpg,.jpeg,.png" />,
    )

    cargar()
    fireEvent.click(await screen.findByRole('button', { name: 'Guardar archivo' }))

    expect(await screen.findByText('Almacenamiento no disponible')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Vista previa de jardin.jpg' })).toBeTruthy()
  })

  it('informa si el navegador no puede representar la vista previa seleccionada', async () => {
    render(
      <Adjuntos entidad="actividad" registroId={7} puedeAdjuntar confirmarSeleccion tiposAceptados=".jpg,.jpeg,.png" />,
    )
    cargar()

    fireEvent.error(await screen.findByRole('img', { name: 'Vista previa de jardin.jpg' }))

    expect(await screen.findByText('No se pudo mostrar la vista previa de esta fotografía.')).toBeTruthy()
    expect(subirAdjunto).not.toHaveBeenCalled()
  })

  it('visualiza una fotografía ya guardada y libera su URL al cerrar', async () => {
    vi.mocked(listarAdjuntos).mockResolvedValueOnce([{
      id: 4,
      uuid_cliente: 'archivo-4',
      entidad: 'actividad',
      registro_id: 7,
      nombre: 'guardada.jpg',
      tipo_mime: 'image/jpeg',
      tamano_bytes: 4,
      descripcion: null,
      usuario: 'Jefe de sección',
      fecha_creacion: '2026-11-10T08:00:00-05:00',
    }])
    vi.mocked(descargarAdjunto).mockResolvedValueOnce(new Blob(['foto'], { type: 'image/jpeg' }))
    render(<Adjuntos entidad="actividad" registroId={7} puedeAdjuntar={false} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Ver guardada.jpg' }))
    expect(await screen.findByRole('img', { name: 'Vista ampliada de guardada.jpg' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(descargarAdjunto).toHaveBeenCalledWith(4)
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('libera las vistas temporales pendientes al desmontarse', async () => {
    const vista = render(
      <Adjuntos entidad="actividad" registroId={7} puedeAdjuntar confirmarSeleccion tiposAceptados=".jpg,.jpeg,.png" />,
    )
    cargar()
    await screen.findByRole('img', { name: 'Vista previa de jardin.jpg' })

    vista.unmount()

    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })
})
