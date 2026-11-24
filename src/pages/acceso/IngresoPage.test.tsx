// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CodigoRol, SesionCore } from '@/types/core'
import IngresoPage from './IngresoPage'

const ingresar = vi.fn()

vi.mock('@/sesion/ContextoSesion', () => ({
  useSesion: () => ({ estado: { tipo: 'sin-sesion' }, ingresar }),
}))

afterEach(() => {
  cleanup()
  ingresar.mockReset()
})

function Destino() {
  const ubicacion = useLocation()
  return <p data-testid="destino">{`${ubicacion.pathname}${ubicacion.search}`}</p>
}

function sesion(codigo: CodigoRol): SesionCore {
  return {
    usuario: { id: 1, nombre: 'Usuario', nombre_usuario: 'usuario' },
    rol: { codigo, nombre: codigo === 'capataz' ? 'Capataz' : 'Jefe de sección' },
    permisos: [],
    debe_cambiar_contrasena: false,
    expira: null,
  }
}

function pintar(ruta = '/ingreso') {
  // jsdom no trae matchMedia: se simula el escritorio.
  window.matchMedia = vi
    .fn()
    .mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/ingreso" element={<IngresoPage />} />
        <Route path="*" element={<Destino />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function completarIngreso(codigo: CodigoRol) {
  ingresar.mockResolvedValue(sesion(codigo))
  const usuario = userEvent.setup()
  await usuario.type(screen.getByLabelText('Correo institucional'), 'usuario@pucp.edu.pe')
  await usuario.type(screen.getByLabelText('Contraseña'), 'secreto')
  await usuario.click(screen.getByRole('button', { name: 'Ingresar' }))
}

describe('IngresoPage', () => {
  it('muestra la marca y los textos de Figma 423:2, sin asteriscos de obligatorio', () => {
    pintar()
    expect(screen.getByRole('heading', { level: 1, name: 'Inicia sesión' })).toBeTruthy()
    expect(screen.getByText('Áreas Verdes')).toBeTruthy()
    expect(screen.getByText('Ingresa con tu cuenta institucional para acceder al sistema.')).toBeTruthy()
    expect(screen.queryByText('* Campo obligatorio')).toBeNull()
    expect(screen.getByLabelText('Correo institucional').hasAttribute('required')).toBe(true)
  })

  it('«¿Olvidaste tu contraseña?» despliega cómo pedir una contraseña temporal', async () => {
    pintar()
    const boton = screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' })
    expect(boton.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText('Pide una contraseña temporal')).toBeNull()

    await userEvent.click(boton)

    expect(boton.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('Pide una contraseña temporal')).toBeTruthy()
  })

  it('sin correo ni contraseña no llama al servidor y avisa en cada campo', async () => {
    pintar()
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(ingresar).not.toHaveBeenCalled()
    expect(screen.getByText('Escribe tu correo institucional')).toBeTruthy()
    expect(screen.getByText('Escribe tu contraseña')).toBeTruthy()
  })

  it('lleva al capataz a la pantalla principal de Operaciones de campo tras iniciar sesión', async () => {
    pintar()
    await completarIngreso('capataz')
    expect((await screen.findByTestId('destino')).textContent).toBe('/operacion-campo/encargos')
  })

  it('mantiene el inicio predeterminado para los demás roles', async () => {
    pintar()
    await completarIngreso('jefe-seccion')
    expect((await screen.findByTestId('destino')).textContent).toBe('/')
  })

  it('conserva para el capataz un destino solicitado antes de iniciar sesión', async () => {
    pintar('/ingreso?volver=%2Fpendientes')
    await completarIngreso('capataz')
    expect((await screen.findByTestId('destino')).textContent).toBe('/pendientes')
  })
})
