// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import type { CodigoRol, SesionCore } from '@/types/core'
import IngresoPage from './IngresoPage'

const sesionMock = vi.hoisted(() => ({
  ingresar: vi.fn(),
  estado: { tipo: 'anonima' } as unknown,
}))
const mapa = vi.hoisted(() => ({ useVistaDeMapa: vi.fn() }))
// Con `diferir`, la navegación con transición se anota pero no se aplica: así se comporta el navegador, que la aplica
// un fotograma después (`startViewTransition`).
const transicion = vi.hoisted(() => ({ diferir: false, destinos: [] as unknown[] }))

vi.mock('@/sesion/ContextoSesion', () => ({
  useSesion: () => ({
    estado: sesionMock.estado,
    ingresar: sesionMock.ingresar,
  }),
}))
vi.mock('../base/movimiento', async (importar) => {
  const real = await importar<typeof import('../base/movimiento')>()
  return {
    ...real,
    useNavegarConTransicion: () => {
      const navegar = real.useNavegarConTransicion()
      return (...argumentos: Parameters<typeof navegar>) => {
        transicion.destinos.push(argumentos[0])
        if (!transicion.diferir) navegar(...argumentos)
      }
    },
  }
})
vi.mock('../base/Escenario', () => ({
  useVistaDeMapa: mapa.useVistaDeMapa,
  ATRIBUTO_MAPA_LIBRE: 'data-mapa-libre',
}))

afterEach(() => {
  cleanup()
  sesionMock.ingresar.mockReset()
  sesionMock.estado = { tipo: 'anonima' }
  mapa.useVistaDeMapa.mockReset()
  transicion.diferir = false
  transicion.destinos = []
})

function Destino() {
  const ubicacion = useLocation()
  return <p data-testid="destino">{`${ubicacion.pathname}${ubicacion.search}`}</p>
}

function sesion(codigo: CodigoRol, debeCambiar = false): SesionCore {
  return {
    usuario: { id: 1, nombre: 'Usuario', nombre_usuario: 'usuario' },
    rol: {
      codigo,
      nombre: codigo === 'capataz' ? 'Capataz' : 'Jefe de sección',
    },
    permisos: [],
    debe_cambiar_contrasena: debeCambiar,
    expira: null,
  }
}

function pintar(ruta = '/n/ingreso', movil = false, estadoRuta?: unknown) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: movil,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: ruta.split('?')[0],
          search: ruta.split('?')[1] ?? '',
          state: estadoRuta,
        },
      ]}
    >
      <Routes>
        <Route path="/n/ingreso" element={<IngresoPage />} />
        <Route path="*" element={<Destino />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function completarIngreso(codigo: CodigoRol, debeCambiar = false) {
  sesionMock.ingresar.mockResolvedValue(sesion(codigo, debeCambiar))
  const usuario = userEvent.setup()
  await usuario.type(screen.getByLabelText('Correo institucional'), 'usuario@pucp.edu.pe')
  await usuario.type(screen.getByLabelText('Contraseña'), 'secreto')
  await usuario.click(screen.getByRole('button', { name: 'Ingresar' }))
}

describe('IngresoPage del diseño nuevo (AV-439)', () => {
  it('se declara vista de mapa y muestra la tarjeta con su título y sus campos', () => {
    pintar()
    expect(mapa.useVistaDeMapa).toHaveBeenCalled()
    expect(screen.getByRole('heading', { level: 1, name: 'Inicia sesión' })).toBeTruthy()
    expect(screen.getByLabelText('Correo institucional')).toBeTruthy()
    expect(screen.getByLabelText('Contraseña')).toBeTruthy()
    expect(screen.queryByText('Mantener sesión en este dispositivo')).toBeNull()
  })

  it('«Mantener sesión en este dispositivo» solo sale en el móvil y se envía con el canal de campo', async () => {
    pintar('/n/ingreso', true)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByLabelText('Mantener sesión en este dispositivo'))
    await completarIngreso('jefe-seccion')
    expect(sesionMock.ingresar).toHaveBeenCalledWith(expect.objectContaining({ canal: 'campo', mantener_sesion: true }))
  })

  it('«¿Olvidaste tu contraseña?» despliega cómo pedir una contraseña temporal', async () => {
    pintar()
    const boton = screen.getByRole('button', {
      name: '¿Olvidaste tu contraseña?',
    })
    expect(boton.getAttribute('aria-expanded')).toBe('false')
    await userEvent.click(boton)
    expect(boton.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('Pide una contraseña temporal')).toBeTruthy()
  })

  it('sin correo ni contraseña no llama al servidor y avisa en cada campo', async () => {
    pintar()
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(sesionMock.ingresar).not.toHaveBeenCalled()
    expect(screen.getByText('Escribe tu correo institucional')).toBeTruthy()
    expect(screen.getByText('Escribe tu contraseña')).toBeTruthy()
  })

  it.each([
    ['bloqueo', 'Cuenta bloqueada por intentos fallidos. Intenta de nuevo en 15 minutos.'],
    ['cuenta no activa', 'La cuenta no está activa. Consulta con el jefe de sección.'],
    ['credenciales', 'Correo o contraseña incorrectos.'],
  ])('muestra tal cual el aviso del servidor (%s) y vacía la contraseña', async (_caso, detalle) => {
    pintar()
    sesionMock.ingresar.mockRejectedValue(new ErrorApi(401, null, detalle))
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('Correo institucional'), 'usuario@pucp.edu.pe')
    await usuario.type(screen.getByLabelText('Contraseña'), 'secreto')
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByText(detalle)).toBeTruthy()
    expect(screen.getByText('No pudimos iniciar la sesión')).toBeTruthy()
    expect((screen.getByLabelText('Contraseña') as HTMLInputElement).value).toBe('')
  })

  it('avisa de que la sesión terminó cuando viene de una sesión perdida', () => {
    pintar('/n/ingreso', false, { perdida: true })
    expect(screen.getByText('Tu sesión terminó')).toBeTruthy()
  })

  it('tras entrar lleva al inicio del diseño nuevo', async () => {
    pintar()
    await completarIngreso('jefe-seccion')
    expect((await screen.findByTestId('destino')).textContent).toBe('/n')
  })

  it('lleva al capataz a Operaciones de campo', async () => {
    pintar()
    await completarIngreso('capataz')
    expect((await screen.findByTestId('destino')).textContent).toBe('/operacion-campo/encargos')
  })

  it('mientras la transición aplica la navegación, la sesión ya activa no la pisa con otro destino', async () => {
    transicion.diferir = true
    pintar()
    sesionMock.ingresar.mockImplementation(() => {
      sesionMock.estado = { tipo: 'activa', sesion: sesion('capataz') }
      return Promise.resolve(sesion('capataz'))
    })
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('Correo institucional'), 'usuario@pucp.edu.pe')
    await usuario.type(screen.getByLabelText('Contraseña'), 'secreto')
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(transicion.destinos).toEqual(['/operacion-campo/encargos'])
    expect(screen.queryByTestId('destino')).toBeNull()
  })

  it('con contraseña temporal lleva al cambio de contraseña del diseño nuevo', async () => {
    pintar()
    await completarIngreso('jefe-seccion', true)
    expect((await screen.findByTestId('destino')).textContent).toBe('/n/cambiar-contrasena')
  })

  it('vuelve a la ruta interna de ?volver=', async () => {
    pintar('/n/ingreso?volver=%2Fpendientes')
    await completarIngreso('jefe-seccion')
    expect((await screen.findByTestId('destino')).textContent).toBe('/pendientes')
  })

  it.each(['https://malo.example/x', '//malo.example', '/\\malo', '/ingreso', '/n/ingreso', '/n/cambiar-contrasena'])(
    '?volver=%s no es un destino válido y se va al inicio',
    async (volver) => {
      pintar(`/n/ingreso?volver=${encodeURIComponent(volver)}`)
      await completarIngreso('jefe-seccion')
      expect((await screen.findByTestId('destino')).textContent).toBe('/n')
    },
  )

  it('con sesión ya abierta no muestra el formulario y sigue a su destino', () => {
    sesionMock.estado = { tipo: 'activa', sesion: sesion('jefe-seccion') }
    pintar()
    expect(screen.getByTestId('destino').textContent).toBe('/n')
  })
})
