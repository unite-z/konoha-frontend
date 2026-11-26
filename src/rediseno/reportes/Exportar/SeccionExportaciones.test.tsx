// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import { generarExportacion, listarExportaciones, listarTiposExportables } from '@/services/api/exportaciones'
import type { SesionCore } from '@/types/core'
import type { ReporteGenerado, TipoExportable } from '@/types/exportaciones'
import SeccionExportaciones from './SeccionExportaciones'

function sesionCon(...permisos: string[]): SesionCore {
  return {
    usuario: { id: 1, nombre: 'Marta', nombre_usuario: 'marta' },
    rol: { codigo: 'jefe-seccion', nombre: 'Jefe' },
    permisos,
    debe_cambiar_contrasena: false,
    expira: null,
  }
}
let sesionActiva: SesionCore | null = null

vi.mock('@/sesion/ContextoSesion', () => ({
  useSesionActiva: () => sesionActiva,
}))
vi.mock('@/sincronizacion/datosDescargados', () => ({
  conCache: (_: string, consultar: () => Promise<unknown>) => consultar(),
}))
vi.mock('@/components/reportes-indicadores/useCatalogosFiltros', () => ({
  useCatalogosFiltros: () => ({
    espacios: [],
    tiposServicio: [],
    reintentar: () => {},
  }),
}))
vi.mock('@/services/api/reportesGestion', () => ({
  obtenerCatalogoServicios: vi.fn().mockResolvedValue({ tipos_servicio: [], proveedores: [] }),
}))
// Con datos reales (no simulados), solo el permiso de exportar habilita el botón.
vi.mock('@/config/datosSimulados', () => ({ DATOS_SIMULADOS: false }))
vi.mock('@/services/api/exportaciones', () => ({
  listarTiposExportables: vi.fn(),
  listarExportaciones: vi.fn(),
  generarExportacion: vi.fn(),
  descargarExportacion: vi.fn(),
}))

const EXPORTAR = 'REP.INDICADOR.EXPORTAR'
const CONSULTAR = 'REP.INDICADOR.CONSULTAR'

const tipos: TipoExportable[] = [
  {
    tipo: 'GestionOSG',
    nombre: 'Reporte de gestión',
    descripcion: 'Resumen mensual para la OSG',
    formatos: ['PDF', 'Excel'],
    filtros: ['mes'],
    disponible: true,
    motivo_no_disponible: null,
    limite_filas: null,
  },
  {
    tipo: 'MaterialVegetal',
    nombre: 'Material vegetal',
    descripcion: 'Movimientos de material vegetal',
    formatos: ['PDF', 'Excel'],
    filtros: ['mes'],
    disponible: true,
    motivo_no_disponible: null,
    limite_filas: null,
  },
  {
    tipo: 'DistribucionPersonal',
    nombre: 'Distribución del personal',
    descripcion: 'Horas por cuadrilla',
    formatos: ['PDF', 'Excel'],
    filtros: ['periodo'],
    disponible: true,
    motivo_no_disponible: null,
    limite_filas: null,
  },
  {
    tipo: 'MatrizIncidencias',
    nombre: 'Matriz de incidencias',
    descripcion: 'Incidencias por espacio',
    formatos: ['PDF'],
    filtros: ['periodo'],
    disponible: true,
    motivo_no_disponible: null,
    limite_filas: null,
  },
]

const reporte: ReporteGenerado = {
  id: 7,
  tipo: 'MaterialVegetal',
  etiqueta_tipo: 'Material vegetal',
  formato: 'PDF',
  parametros: { mes: '2026-10' },
  resumen_parametros: 'Octubre de 2026',
  usuario: 'Marta',
  fecha_hora: '2026-11-25T15:00:00Z',
  archivo: { id: 1, nombre: 'material-2026-10.pdf', tamano_bytes: 2048 },
  filas: 12,
}

const pagina = (results: ReporteGenerado[]) => ({
  count: results.length,
  next: null,
  previous: null,
  results,
})

function Url() {
  return <output aria-label="url">{useLocation().search}</output>
}

function montar(entrada = '/n/reportes') {
  const router = createMemoryRouter(
    [
      {
        path: '/n/reportes',
        element: (
          <>
            <Url />
            <SeccionExportaciones />
          </>
        ),
      },
    ],
    { initialEntries: [entrada] },
  )
  render(<RouterProvider router={router} />)
  return router
}

beforeEach(() => {
  sesionActiva = sesionCon(CONSULTAR, EXPORTAR)
  vi.mocked(listarTiposExportables).mockResolvedValue(tipos)
  vi.mocked(listarExportaciones).mockResolvedValue(pagina([reporte]))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Reportes · Exportar (RD-62)', () => {
  it('con permiso muestra «Exportar» y el historial', async () => {
    montar()
    expect(await screen.findByText('Octubre de 2026')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Exportar' })).toBeTruthy()
  })

  it('sin REP.INDICADOR.EXPORTAR no hay botón ni panel, pero sí historial', async () => {
    sesionActiva = sesionCon(CONSULTAR)
    montar('/n/reportes?tipo=MaterialVegetal&mes=2026-10')
    expect(await screen.findByText('Octubre de 2026')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Exportar' })).toBeNull()
    expect(screen.queryByRole('complementary')).toBeNull()
  })

  it('«Exportar» abre el panel con los tipos, el formato y los filtros; la matriz sale deshabilitada', async () => {
    const usuario = userEvent.setup()
    montar()
    await usuario.click(await screen.findByRole('button', { name: 'Exportar' }))
    const panel = await screen.findByRole('complementary', {
      name: 'Exportar reporte',
    })
    expect(screen.getByLabelText('url').textContent).toContain('exportar=1')
    expect(await within(panel).findByRole('radio', { name: /Reporte de gestión/ })).toBeTruthy()
    const matriz = within(panel).getByRole('radio', {
      name: /Matriz de incidencias/,
    }) as HTMLInputElement
    expect(matriz.disabled).toBe(true)
    expect(within(panel).getByLabelText(/Mes/)).toBeTruthy()

    await usuario.click(within(panel).getByRole('button', { name: 'Cerrar panel' }))
    await waitFor(() => expect(screen.queryByRole('complementary')).toBeNull())
    expect(screen.getByLabelText('url').textContent).not.toContain('exportar')
  })

  it('?tipo=&mes= precarga el panel', async () => {
    montar('/n/reportes?tipo=MaterialVegetal&mes=2026-09')
    const panel = await screen.findByRole('complementary', {
      name: 'Exportar reporte',
    })
    const elegido = (await within(panel).findByRole('radio', {
      name: /Material vegetal/,
    })) as HTMLInputElement
    expect(elegido.checked).toBe(true)
    expect((within(panel).getByLabelText(/Mes/) as HTMLInputElement).value).toBe('2026-09')
  })

  it('la URL precarga también el formato y el periodo', async () => {
    montar('/n/reportes?tipo=DistribucionPersonal&desde=2026-10-01&hasta=2026-10-31&formato=Excel')
    const panel = await screen.findByRole('complementary', { name: 'Exportar reporte' })
    const elegido = (await within(panel).findByRole('radio', { name: /Distribución del personal/ })) as HTMLInputElement
    expect(elegido.checked).toBe(true)
    expect((within(panel).getByLabelText(/Desde/) as HTMLInputElement).value).toBe('2026-10-01')
    expect((within(panel).getByLabelText(/Hasta/) as HTMLInputElement).value).toBe('2026-10-31')
    expect((within(panel).getByRole('radio', { name: /Excel/ }) as HTMLInputElement).checked).toBe(true)
  })

  it('?mes= solo (filtro de un informe) no abre el panel', async () => {
    montar('/n/reportes?mes=2026-10')
    expect(await screen.findByText('Octubre de 2026')).toBeTruthy()
    expect(screen.queryByRole('complementary')).toBeNull()
  })

  it('con el panel de un indicador abierto no se superpone; «Exportar» lo sustituye', async () => {
    const usuario = userEvent.setup()
    montar('/n/reportes?indicador=actividades-por-estado&tipo=MaterialVegetal')
    await usuario.click(await screen.findByRole('button', { name: 'Exportar' }))
    expect(await screen.findByRole('complementary', { name: 'Exportar reporte' })).toBeTruthy()
    expect(screen.getByLabelText('url').textContent).not.toContain('indicador')
  })

  it('generar crea el reporte, refresca el historial y cierra el panel', async () => {
    const usuario = userEvent.setup()
    vi.mocked(generarExportacion).mockResolvedValue(reporte)
    montar('/n/reportes?tipo=MaterialVegetal&mes=2026-10')
    const panel = await screen.findByRole('complementary', {
      name: 'Exportar reporte',
    })
    await usuario.click(await within(panel).findByRole('button', { name: 'Generar reporte' }))
    await waitFor(() => expect(generarExportacion).toHaveBeenCalled())
    expect(vi.mocked(generarExportacion).mock.calls[0][0]).toMatchObject({
      tipo: 'MaterialVegetal',
      formato: 'PDF',
      parametros: { mes: '2026-10' },
    })
    await waitFor(() => expect(screen.queryByRole('complementary')).toBeNull())
    expect(await screen.findByText('Reporte generado: material-2026-10.pdf')).toBeTruthy()
    expect(listarExportaciones).toHaveBeenCalledTimes(2)
  })

  it('historial vacío', async () => {
    vi.mocked(listarExportaciones).mockResolvedValue(pagina([]))
    montar()
    expect(await screen.findByText('Aún no se ha generado ningún reporte')).toBeTruthy()
  })

  it('error del historial ofrece reintentar', async () => {
    vi.mocked(listarExportaciones).mockRejectedValueOnce(new ErrorApi(500, null, 'El servidor no responde'))
    montar()
    expect(await screen.findByText('No se pudieron cargar los reportes generados')).toBeTruthy()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Octubre de 2026')).toBeTruthy()
  })

  it('un 403 del historial muestra «sin acceso»', async () => {
    vi.mocked(listarExportaciones).mockRejectedValue(new ErrorApi(403, null, 'Tu rol no puede ver exportaciones'))
    montar()
    expect(await screen.findByText('No tienes acceso al historial de exportaciones')).toBeTruthy()
  })

  it('un error al cargar los tipos se ve en el panel con reintentar', async () => {
    const usuario = userEvent.setup()
    vi.mocked(listarTiposExportables).mockRejectedValueOnce(new ErrorApi(500, null, 'Falla'))
    montar()
    await usuario.click(await screen.findByRole('button', { name: 'Exportar' }))
    const panel = await screen.findByRole('complementary', {
      name: 'Exportar reporte',
    })
    expect(await within(panel).findByText('No se pudieron cargar los tipos de reporte')).toBeTruthy()
  })
})
