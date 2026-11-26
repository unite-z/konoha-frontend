// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import { vaciar } from '@/sincronizacion/almacenLocal'
import { reiniciarColaParaPruebas } from '@/sincronizacion/cola'
import type { JardinRuta, RespuestaRutaDeHoy } from '@/types/corte'
import { rutaCampoJardin, rutaCampoMas, rutaCampoRutaDeHoy, rutaCampoSemana } from './enlaces'
import { rutasCampo } from './rutas'
import { seccionCampo } from './seccion'

const CORTE = 'PLA.CORTE.REGISTRAR'
const estado = vi.hoisted(() => ({ permisos: [] as string[] }))
const cerrarSesion = vi.hoisted(() => vi.fn())
vi.mock('@/sesion/ContextoSesion', () => ({
  usePermisos: () => estado.permisos,
  useSesionActiva: () => ({
    usuario: { id: 4, nombre: 'J. Ramos', nombre_usuario: 'jramos' },
    rol: { codigo: 'capataz', nombre: 'Capataz' },
    permisos: estado.permisos,
  }),
  useSesion: () => ({ cerrarSesion }),
}))

let respuesta: RespuestaRutaDeHoy | ErrorApi
const marcarJardin = vi.fn()
const registrarObservacionJardin = vi.fn(async () => ({ id: 1, texto: '' }))
const calendario = vi.hoisted(() => vi.fn())
vi.mock('@/services/api/corte', () => ({
  obtenerRutaDeHoy: async () => {
    if (respuesta instanceof ErrorApi) throw respuesta
    return respuesta
  },
  marcarJardin: (...a: unknown[]) => marcarJardin(...a),
  registrarObservacionJardin: (...a: unknown[]) => registrarObservacionJardin(...(a as [])),
  obtenerCalendarioCuadrilla: calendario,
}))
vi.mock('@/components/core/HistorialCambios', () => ({ default: () => null }))
vi.mock('@/components/core/Adjuntos', () => ({ default: () => null }))

function jardin(id: number, codigo: string, nombre: string, marcadoEn: string | null = null): JardinRuta {
  return {
    id,
    codigo,
    nombre,
    zona: 'Ciencias',
    estado: marcadoEn ? 'Cortado' : 'Pendiente',
    marcado_en: marcadoEn,
    marcado_por: marcadoEn ? 'J. Ramos' : null,
    detenido_por_interrupcion: false,
  }
}

function montar(ruta: string) {
  const router = createMemoryRouter([{ path: '/n', children: rutasCampo }], { initialEntries: [ruta] })
  render(<RouterProvider router={router} />)
  return router
}

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false
  }
})
beforeEach(() => {
  estado.permisos = [CORTE, 'INV.INVENTARIO.CONSULTAR']
  respuesta = {
    ruta: {
      programacion_id: 11,
      codigo: 'CC-2026-11',
      servicio: 'Corte de césped',
      jardines: [
        jardin(1, 'J-015', 'Patio de Física', '2026-11-04T10:18:00-05:00'),
        jardin(2, 'J-016', 'Talud de Química'),
      ],
    },
  }
})
afterEach(async () => {
  cleanup()
  vi.clearAllMocks()
  reiniciarColaParaPruebas()
  await vaciar('pendientes')
})

describe('campo · sección', () => {
  it('declara las cuatro entradas de la barra inferior y no pinta otra barra', () => {
    expect(seccionCampo.movil.map((e) => e.etiqueta)).toEqual(['Ruta de hoy', 'Semana', 'Encargos', 'Incidencias'])
    expect(seccionCampo.enCabecera).toBe(false)
  })
})

describe('Ruta de hoy', () => {
  it('muestra el avance y marca con un toque, con hora real y clave de idempotencia', async () => {
    marcarJardin.mockImplementation(async (_p: number, id: number, en: string) => jardin(id, 'J-016', 'Talud de Química', en))
    montar(rutaCampoRutaDeHoy())
    expect(await screen.findByText('1 de 2')).toBeTruthy()
    await userEvent.setup().click(screen.getByRole('button', { name: /^J-016 · Talud de Química, pendiente/ }))
    expect(marcarJardin).toHaveBeenCalledWith(11, 2, expect.any(String), expect.any(String))
    expect(await screen.findByText('2 de 2')).toBeTruthy()
  })

  it('en Marcados abre la hoja «ya está marcado» y añade la observación', async () => {
    montar(rutaCampoRutaDeHoy())
    const u = userEvent.setup()
    await screen.findByText('1 de 2')
    await u.click(screen.getByRole('tab', { name: /Marcados/ }))
    await u.click(screen.getByRole('button', { name: /^J-015 · Patio de Física, marcado/ }))
    expect(await screen.findByText('Por J. Ramos a las 10:18.')).toBeTruthy()
    await u.type(screen.getByLabelText('Observación'), 'Franja sin cortar')
    await u.click(screen.getByRole('button', { name: 'Añadir observación' }))
    expect(registrarObservacionJardin).toHaveBeenCalledWith(11, 1, 'Franja sin cortar')
    expect(await screen.findByText('Observación añadida a J-015')).toBeTruthy()
  })

  it('con ?jardin= en la URL abre la hoja', async () => {
    montar(rutaCampoJardin(1))
    expect(await screen.findByText('J-015 ya está marcado')).toBeTruthy()
  })

  it('sin conexión deja la marca «Sin sincronizar» y lo dice en la banda', async () => {
    const enLinea = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    montar(rutaCampoRutaDeHoy())
    await screen.findByText('1 de 2')
    await userEvent.setup().click(screen.getByRole('button', { name: /^J-016 · Talud de Química, pendiente/ }))
    expect(marcarJardin).not.toHaveBeenCalled()
    expect(await screen.findByText('Sin conexión · 1 marca pendiente de enviar')).toBeTruthy()
    expect(screen.getByRole('button', { name: /^J-016 · Talud de Química, sin sincronizar/ })).toBeTruthy()
    enLinea.mockRestore()
  })

  it('sin corte hoy lo dice', async () => {
    respuesta = { ruta: null }
    montar(rutaCampoRutaDeHoy())
    expect(await screen.findByText('Hoy no hay corte en tu cuadrilla')).toBeTruthy()
  })

  it('si falla la carga ofrece reintentar', async () => {
    respuesta = new ErrorApi(500, 'x', 'Fallo del servidor')
    montar(rutaCampoRutaDeHoy())
    expect(await screen.findByText('No pudimos cargar tu ruta')).toBeTruthy()
  })

  it('sin el permiso del corte o con 403 muestra «sin acceso»', async () => {
    estado.permisos = []
    montar(rutaCampoRutaDeHoy())
    expect(await screen.findByText('No tienes acceso a la ruta de hoy')).toBeTruthy()
    cleanup()
    estado.permisos = [CORTE]
    respuesta = new ErrorApi(403, 'x', 'Prohibido')
    montar(rutaCampoRutaDeHoy())
    expect(await screen.findByText('No tienes acceso a la ruta de hoy')).toBeTruthy()
  })
})

describe('Semana', () => {
  it('muestra la cuadrilla en solo lectura', async () => {
    calendario.mockResolvedValue({ cuadrilla: 'Cuadrilla B', restricciones: [], programaciones: [] })
    montar(rutaCampoSemana())
    expect(await screen.findByText('Cuadrilla B · solo lectura')).toBeTruthy()
  })

  it('sin permiso muestra «sin acceso» y no consulta', async () => {
    estado.permisos = []
    montar(rutaCampoSemana())
    expect(await screen.findByText('No tienes acceso a la semana de tu cuadrilla')).toBeTruthy()
    expect(calendario).not.toHaveBeenCalled()
  })

  it('si falla la carga lo dice', async () => {
    calendario.mockRejectedValue(new ErrorApi(500, 'x', 'Fallo'))
    montar(rutaCampoSemana())
    expect(await screen.findByText('No pudimos cargar la semana')).toBeTruthy()
  })
})

describe('Más', () => {
  it('ofrece lo que la barra no enseña según los permisos y cierra la sesión', async () => {
    montar(rutaCampoMas())
    expect(await screen.findByRole('heading', { name: 'Más' })).toBeTruthy()
    const nombres = screen.getAllByRole('link').map((a) => a.textContent)
    expect(nombres).toEqual([
      'MapaSolo lectura',
      'Datos sin conexiónNada por enviar',
      'Apariencia',
      'Cambiar contraseña',
    ])
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(cerrarSesion).toHaveBeenCalled()
  })

  it('con permiso de repositorio lo añade', async () => {
    estado.permisos = [CORTE, 'CORE.REPOSITORIO.CONSULTAR']
    montar(rutaCampoMas())
    expect(await screen.findByRole('link', { name: 'Repositorio' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: /^Mapa/ })).toBeNull()
  })
})
