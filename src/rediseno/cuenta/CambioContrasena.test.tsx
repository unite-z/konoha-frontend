// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import CambioContrasena from './CambioContrasena'

const api = vi.hoisted(() => ({
  cambiarContrasena: vi.fn(),
  recargar: vi.fn(),
  cerrarSesion: vi.fn(),
  temporal: true,
}))
vi.mock('@/services/api/core', () => ({
  cambiarContrasena: api.cambiarContrasena,
}))
vi.mock('@/sesion/ContextoSesion', () => ({
  useSesion: () => ({ recargar: api.recargar, cerrarSesion: api.cerrarSesion }),
  useSesionActiva: () => ({ debe_cambiar_contrasena: api.temporal }),
}))

afterEach(() => {
  cleanup()
  Object.values(api).forEach((f) => typeof f === 'function' && 'mockReset' in f && f.mockReset())
  api.temporal = true
})

function Destino() {
  const { pathname } = useLocation()
  return <p data-testid="destino">{pathname}</p>
}

function pintar() {
  render(
    <MemoryRouter initialEntries={['/anterior', '/n/cambiar-contrasena']}>
      <Routes>
        <Route path="/n/cambiar-contrasena" element={<CambioContrasena />} />
        <Route path="*" element={<Destino />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function escribir(actual: string, nueva: string, confirmacion: string) {
  const usuario = userEvent.setup()
  await usuario.type(screen.getByLabelText(/Contraseña (temporal|actual)/), actual)
  await usuario.type(screen.getByLabelText(/^Contraseña nueva/), nueva)
  await usuario.type(screen.getByLabelText(/^Repite la contraseña nueva/), confirmacion)
  await usuario.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
}

describe('CambioContrasena del diseño nuevo (AV-439)', () => {
  it('con contraseña temporal es obligatorio: pide la temporal y ofrece cerrar sesión, no cancelar', async () => {
    pintar()
    expect(screen.getByRole('heading', { name: 'Define tu contraseña' })).toBeTruthy()
    expect(screen.getByLabelText(/Contraseña temporal/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Cancelar' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(api.cerrarSesion).toHaveBeenCalled()
  })

  it('con contraseña propia permite cancelar y vuelve atrás', async () => {
    api.temporal = false
    pintar()
    expect(screen.getByRole('heading', { name: 'Cambiar contraseña' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect((await screen.findByTestId('destino')).textContent).toBe('/anterior')
  })

  it('valida la política antes de enviar y avisa en cada campo', async () => {
    pintar()
    await escribir('Temporal1', 'corta', 'otra')
    expect(api.cambiarContrasena).not.toHaveBeenCalled()
    expect(screen.getByText('No coincide con la contraseña nueva')).toBeTruthy()
    expect(screen.getByLabelText(/^Contraseña nueva/).getAttribute('aria-invalid')).toBe('true')
  })

  it('la nueva no puede ser igual a la actual', async () => {
    pintar()
    await escribir('Clave2026ok', 'Clave2026ok', 'Clave2026ok')
    expect(api.cambiarContrasena).not.toHaveBeenCalled()
    expect(screen.getByText('Debe ser distinta de la contraseña actual')).toBeTruthy()
  })

  it('al guardar cambia la contraseña, recarga la sesión y lleva al inicio', async () => {
    api.cambiarContrasena.mockResolvedValue(undefined)
    api.recargar.mockResolvedValue(undefined)
    pintar()
    await escribir('Temporal1', 'Nueva2026ok', 'Nueva2026ok')
    await waitFor(() =>
      expect(api.cambiarContrasena).toHaveBeenCalledWith({
        contrasena_actual: 'Temporal1',
        contrasena_nueva: 'Nueva2026ok',
        confirmacion: 'Nueva2026ok',
      }),
    )
    expect(api.recargar).toHaveBeenCalled()
    expect((await screen.findByTestId('destino')).textContent).toBe('/n')
  })

  it('muestra el error del servidor y se queda en la pantalla', async () => {
    api.cambiarContrasena.mockRejectedValue(new ErrorApi(400, null, 'La contraseña temporal no es correcta.'))
    pintar()
    await escribir('Temporal1', 'Nueva2026ok', 'Nueva2026ok')
    expect(await screen.findByText('La contraseña temporal no es correcta.')).toBeTruthy()
    expect(screen.getByText('No pudimos cambiar la contraseña')).toBeTruthy()
    expect(api.recargar).not.toHaveBeenCalled()
  })
})
