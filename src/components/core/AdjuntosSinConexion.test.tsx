// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import { vaciar } from '@/sincronizacion/almacenLocal'
import { leerEstadoCola, reiniciarColaParaPruebas } from '@/sincronizacion/cola'
import Adjuntos from './Adjuntos'

const subirAdjunto = vi.fn()
vi.mock('@/services/api/core', () => ({
  listarAdjuntos: async () => [],
  descargarAdjunto: vi.fn(),
  subirAdjunto: (...argumentos: unknown[]) => subirAdjunto(...argumentos),
}))
vi.mock('@/sesion/ContextoSesion', () => ({ useSesionActiva: () => ({ usuario: { id: 4, nombre: 'J. Ramos' } }) }))

afterEach(async () => {
  cleanup()
  subirAdjunto.mockReset()
  reiniciarColaParaPruebas()
  await vaciar('pendientes')
})

const foto = new File(['x'], 'poda.jpg', { type: 'image/jpeg' })

describe('Adjuntos sin conexión (RF-T-012)', () => {
  it('si se corta la red al subir, deja la foto en la cola con su clave y la cuenta como pendiente', async () => {
    subirAdjunto.mockRejectedValue(new ErrorApi(0, null, 'sin red'))
    render(<Adjuntos entidad="actividad" registroId={900} puedeAdjuntar />)
    await userEvent.setup().upload(document.querySelector('input[type="file"]') as HTMLInputElement, foto)
    expect(await screen.findByText('1 archivo pendiente de enviar')).toBeTruthy()
    const [p] = leerEstadoCola().pendientes
    expect(p).toMatchObject({ tipo: 'core.adjunto', carga: { entidad: 'actividad', registro_id: 900 }, usuario_id: 4 })
    expect(subirAdjunto.mock.calls[0][3]).toBe(p.id)
  })

  it('con el registro aún en la cola, la foto espera a que exista y toma su id', async () => {
    render(<Adjuntos entidad="actividad" registroId={0} registroPendiente="poda-1" puedeAdjuntar />)
    await userEvent.setup().upload(document.querySelector('input[type="file"]') as HTMLInputElement, foto)
    expect(await screen.findByText('1 archivo pendiente de enviar')).toBeTruthy()
    expect(subirAdjunto).not.toHaveBeenCalled()
    expect(leerEstadoCola().pendientes[0]).toMatchObject({ depende_de: 'poda-1', referencias: ['registro_id'], carga: { registro_id: null } })
  })
})
