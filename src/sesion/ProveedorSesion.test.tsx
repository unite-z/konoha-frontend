// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import type { SesionCore } from '@/types/core'
import { useSesion } from './ContextoSesion'
import { guardarInstantanea, leerInstantanea, borrarInstantanea } from './instantaneaSesion'
import ProveedorSesion from './ProveedorSesion'

const obtenerSesion = vi.fn<() => Promise<SesionCore>>()
vi.mock('@/services/api/core', () => ({
  obtenerSesion: () => obtenerSesion(),
  iniciarSesion: vi.fn(),
  cerrarSesionCore: vi.fn(),
}))

const sesion: SesionCore = {
  usuario: { id: 3, nombre: 'Luis P.', nombre_usuario: 'lp' },
  rol: { codigo: 'capataz', nombre: 'Capataz' },
  permisos: ['PLA.CORTE.REGISTRAR'],
  debe_cambiar_contrasena: false,
  expira: null,
}

function Estado() {
  const { estado } = useSesion()
  return <p>{estado.tipo}</p>
}

beforeEach(async () => {
  obtenerSesion.mockReset()
  await borrarInstantanea()
})
afterEach(cleanup)

describe('ProveedorSesion sin conexión (RF-T-012)', () => {
  it('con una sesión comprobada antes, abre sin conexión con su instantánea', async () => {
    await guardarInstantanea(sesion)
    obtenerSesion.mockRejectedValue(new ErrorApi(0, null, 'sin red'))
    render(
      <ProveedorSesion>
        <Estado />
      </ProveedorSesion>,
    )
    expect(await screen.findByText('sinConexion')).toBeTruthy()
  })

  it('sin instantánea, sigue sin poder comprobar la sesión', async () => {
    obtenerSesion.mockRejectedValue(new ErrorApi(0, null, 'sin red'))
    render(
      <ProveedorSesion>
        <Estado />
      </ProveedorSesion>,
    )
    expect(await screen.findByText('error')).toBeTruthy()
  })

  it('con conexión guarda la instantánea, y un 401 la borra', async () => {
    obtenerSesion.mockResolvedValue(sesion)
    render(
      <ProveedorSesion>
        <Estado />
      </ProveedorSesion>,
    )
    expect(await screen.findByText('activa')).toBeTruthy()
    await vi.waitFor(async () => expect(await leerInstantanea()).toEqual(sesion))
    cleanup()
    obtenerSesion.mockRejectedValue(new ErrorApi(401, 'no-autenticado', 'Inicia sesión'))
    render(
      <ProveedorSesion>
        <Estado />
      </ProveedorSesion>,
    )
    expect(await screen.findByText('anonima')).toBeTruthy()
    await vi.waitFor(async () => expect(await leerInstantanea()).toBeNull())
  })

  it('al entrar aplica la apariencia guardada en la cuenta (AV-391)', async () => {
    obtenerSesion.mockResolvedValue({ ...sesion, apariencia: { tema: 'oscuro', acento: 'magenta' } })
    render(
      <ProveedorSesion>
        <Estado />
      </ProveedorSesion>,
    )
    expect(await screen.findByText('activa')).toBeTruthy()
    expect(document.documentElement.dataset.tema).toBe('oscuro')
    expect(document.documentElement.dataset.acento).toBe('magenta')
    delete document.documentElement.dataset.tema
    delete document.documentElement.dataset.acento
  })
})
