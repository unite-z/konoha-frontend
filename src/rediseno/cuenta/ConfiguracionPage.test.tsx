// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { ContextoSesion, type ValorSesion } from '@/sesion/ContextoSesion'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import ConfiguracionPage from './ConfiguracionPage'
import { SECCIONES_CONFIGURACION, type SeccionConfiguracion } from './secciones'

const mock = vi.hoisted(() => ({
  permisos: [] as string[],
  guardarAparienciaCuenta: vi.fn(),
  cerrarSesion: vi.fn(),
}))
vi.mock('@/hooks/usePaginaActual', () => ({ usePaginaActual: () => {} }))
vi.mock('@/services/api/core', () => ({
  guardarAparienciaCuenta: mock.guardarAparienciaCuenta,
}))
vi.mock('@/sesion/ContextoSesion', async (importar) => ({
  ...(await importar<typeof import('@/sesion/ContextoSesion')>()),
  usePermisos: () => mock.permisos,
  useSesion: () => ({ cerrarSesion: mock.cerrarSesion }),
  useSesionActiva: () => ({
    usuario: { id: 1, nombre: 'Robert G.', nombre_usuario: 'rgarcia' },
    rol: { codigo: 'jefe-seccion', nombre: 'Jefe de sección' },
    permisos: mock.permisos,
  }),
}))

const datos = new Map<string, string>()

beforeEach(() => {
  datos.clear()
  mock.permisos = []
  mock.guardarAparienciaCuenta.mockReset().mockImplementation(async (a: unknown) => a)
  mock.cerrarSesion.mockReset().mockResolvedValue(undefined)
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
  })
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
  delete document.documentElement.dataset.tema
  delete document.documentElement.dataset.acento
  delete document.documentElement.dataset.lecturaTamano
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function Prueba() {
  return null
}

const RESTRINGIDA: SeccionConfiguracion = {
  id: 'roles',
  etiqueta: 'Roles',
  descripcion: 'Quién puede qué.',
  permisos: ['CORE.ROL.GESTIONAR'],
  Componente: Prueba,
}

/** Sesión cuya cuenta ya guarda «Diseño nuevo» (AV-414): el `PUT` de Apariencia debe conservarlo. */
const CUENTA_CON_DISENO = {
  estado: {
    tipo: 'activa',
    sesion: {
      apariencia: {
        tema: 'claro',
        acento: 'institucional',
        diseno_nuevo: true,
      },
    },
  },
} as unknown as ValorSesion

function pintar(ruta = '/n/cuenta', secciones?: readonly SeccionConfiguracion[], sesion: ValorSesion | null = null) {
  render(
    <ContextoSesion.Provider value={sesion}>
      <MemoryRouter initialEntries={[ruta]}>
        <ConfiguracionPage secciones={secciones} />
      </MemoryRouter>
    </ContextoSesion.Provider>,
  )
}

describe('Configuración del diseño nuevo (RD-64)', () => {
  it('cualquier sesión ve Apariencia, Cuenta y Lectura, y Apariencia es la primera', () => {
    pintar()
    expect(screen.getByRole('heading', { level: 1, name: 'Configuración' })).toBeTruthy()
    const enlaces = within(screen.getByRole('navigation', { name: 'Secciones de configuración' }))
      .getAllByRole('link')
      .map((e) => e.textContent)
    expect(enlaces).toEqual(['Apariencia', 'Cuenta', 'Lectura'])
    expect(screen.getByRole('link', { name: 'Apariencia' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('heading', { level: 2, name: 'Apariencia' })).toBeTruthy()
  })

  it('cada sección sale solo con su permiso', () => {
    const secciones = [...SECCIONES_CONFIGURACION, RESTRINGIDA]
    pintar('/n/cuenta', secciones)
    expect(screen.queryByRole('link', { name: 'Roles' })).toBeNull()
    cleanup()

    mock.permisos = ['CORE.ROL.GESTIONAR']
    pintar('/n/cuenta', secciones)
    expect(screen.getByRole('link', { name: 'Roles' })).toBeTruthy()
  })

  it('abre la sección de la URL', () => {
    pintar('/n/cuenta?seccion=cuenta')
    expect(screen.getByRole('link', { name: 'Cuenta' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByText('rgarcia')).toBeTruthy()
  })

  it('con enlace directo a una sección sin permiso muestra «Sin acceso» y no la lista', () => {
    pintar('/n/cuenta?seccion=roles', [...SECCIONES_CONFIGURACION, RESTRINGIDA])
    expect(screen.getByRole('heading', { name: 'No tienes acceso a Roles' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Roles' })).toBeNull()
  })

  it('cambiar de sección con el teclado va a la sección elegida', async () => {
    const usuario = userEvent.setup()
    pintar()
    await usuario.click(screen.getByRole('link', { name: 'Lectura' }))
    expect(screen.getByRole('heading', { level: 2, name: 'Lectura' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Lectura' }).getAttribute('aria-current')).toBe('page')
  })

  it('sin ninguna sección visible, lo dice', () => {
    pintar('/n/cuenta', [RESTRINGIDA])
    expect(screen.getByRole('heading', { name: 'No hay nada que configurar' })).toBeTruthy()
  })
})

describe('Apariencia (M1-05)', () => {
  it('ofrece Amarillento, aplica el tema al instante y lo guarda en la cuenta con «Diseño nuevo»', async () => {
    const usuario = userEvent.setup()
    pintar('/n/cuenta', undefined, CUENTA_CON_DISENO)
    await usuario.click(screen.getByRole('radio', { name: 'Amarillento' }))
    expect(document.documentElement.dataset.tema).toBe('amarillento')
    expect(JSON.parse(datos.get('av:apariencia') ?? '{}')).toEqual({
      tema: 'amarillento',
      acento: 'institucional',
    })
    expect(mock.guardarAparienciaCuenta).toHaveBeenLastCalledWith({
      tema: 'amarillento',
      acento: 'institucional',
      diseno_nuevo: true,
    })
  })

  it('marca el tema que se está viendo, aunque lo guardado sea otro', () => {
    datos.set('av:apariencia', '{"tema":"claro","acento":"verde"}')
    document.documentElement.dataset.tema = 'amarillento'
    pintar()
    expect((screen.getByRole('radio', { name: 'Amarillento' }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByRole('radio', { name: /Verde PUCP/ }) as HTMLInputElement).checked).toBe(true)
  })

  it('enseña el interruptor «Diseño nuevo» y la vista previa', () => {
    pintar()
    expect(screen.getByRole('radio', { name: 'Encendido' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Vista previa' })).toBeTruthy()
  })

  it('si la cuenta no lo guarda, avisa y lo deja aplicado en el navegador', async () => {
    mock.guardarAparienciaCuenta.mockRejectedValue(new Error('sin red'))
    const usuario = userEvent.setup()
    pintar()
    await usuario.click(screen.getByRole('radio', { name: 'Oscuro' }))
    expect(await screen.findByText(/No pudimos guardarla en tu cuenta/)).toBeTruthy()
    expect(document.documentElement.dataset.tema).toBe('oscuro')
  })
})

describe('Cuenta (N-02)', () => {
  it('enseña quién eres y enlaza con el cambio de contraseña', () => {
    pintar('/n/cuenta?seccion=cuenta')
    expect(screen.getByText('Robert G.')).toBeTruthy()
    expect(screen.getByText('Jefe de sección')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Cambiar contraseña' }).getAttribute('href')).toBe('/n/cambiar-contrasena')
  })

  it('«Cerrar sesión» cierra la sesión', async () => {
    const usuario = userEvent.setup()
    pintar('/n/cuenta?seccion=cuenta')
    await usuario.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(mock.cerrarSesion).toHaveBeenCalledTimes(1)
  })

  it('si no se pudo cerrar la sesión, lo explica y deja volver a intentarlo', async () => {
    mock.cerrarSesion.mockRejectedValue(new ErrorApi(500, 'Error del servidor', 'Servicio no disponible'))
    const usuario = userEvent.setup()
    pintar('/n/cuenta?seccion=cuenta')
    await usuario.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(await screen.findByText('Servicio no disponible')).toBeTruthy()
    await waitFor(() =>
      expect(
        (
          screen.getByRole('button', {
            name: 'Cerrar sesión',
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    )
  })
})

describe('Lectura (P-16)', () => {
  it('guarda el tamaño del texto en el navegador y lo aplica', async () => {
    const usuario = userEvent.setup()
    pintar('/n/cuenta?seccion=lectura')
    expect((screen.getByRole('radio', { name: 'Normal' }) as HTMLInputElement).checked).toBe(true)
    await usuario.click(screen.getByRole('radio', { name: 'Grande' }))
    expect(document.documentElement.dataset.lecturaTamano).toBe('grande')
    expect(datos.get('av:lectura')).toBe('grande')
    await usuario.click(screen.getByRole('radio', { name: 'Normal' }))
    expect(document.documentElement.dataset.lecturaTamano).toBeUndefined()
  })
})
