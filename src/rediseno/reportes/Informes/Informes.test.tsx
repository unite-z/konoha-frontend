// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import {
  obtenerAtencionesEspacioSector,
  obtenerCumplimientoCorte,
  obtenerDistribucionPersonal,
} from '@/services/api/reportes'
import { obtenerPanel } from '@/services/api/reportesGestion'
import type { SesionCore } from '@/types/core'
import type { FilaCumplimiento, ResultadoCumplimientoCorte, ResultadoDistribucionPersonal } from '@/types/reportes'
import ReportesPage from '../ReportesPage'

const sesion: SesionCore = {
  usuario: { id: 1, nombre: 'Marta', nombre_usuario: 'marta' },
  rol: { codigo: 'jefe-seccion', nombre: 'Jefe' },
  permisos: ['REP.INDICADOR.CONSULTAR'],
  debe_cambiar_contrasena: false,
  expira: null,
}
let sesionActiva: SesionCore | null = sesion

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
vi.mock('@/services/api/exportaciones', () => ({
  listarTiposExportables: vi.fn().mockResolvedValue([]),
  listarExportaciones: vi.fn().mockResolvedValue({ count: 0, next: null, previous: null, results: [] }),
}))
vi.mock('@/services/api/reportesGestion', () => ({
  obtenerPanel: vi.fn(),
  obtenerDetalleIndicador: vi.fn(),
}))
vi.mock('@/services/api/reportes', () => ({
  obtenerCumplimientoCorte: vi.fn(),
  obtenerDistribucionPersonal: vi.fn(),
  obtenerAtencionesEspacioSector: vi.fn(),
}))

const base = {
  periodo: { desde: '2026-11-01', hasta: '2026-11-30' },
  generado_en: '2026-11-26T15:00:00Z',
  sin_datos: false,
  mensaje_sin_datos: null,
}

const ciclo: FilaCumplimiento = {
  ciclo_id: 7,
  estado_ciclo: 'Cerrado',
  proveedor_id: 1,
  proveedor_razon_social: 'Terraverde',
  ruta_id: 1,
  ruta_nombre: 'Ruta norte',
  estacion: 'Primavera',
  fecha_inicio_real: '2026-11-03',
  ciclo_anterior_id: null,
  fecha_inicio_anterior: null,
  dias_entre_ciclos: 30,
  frecuencia_teorica_dias: 30,
  frecuencia_practica_dias: 30,
  frecuencia_maxima_dias: 45,
  estado_frecuencia: 'Dentro de la frecuencia',
  fecha_fin_corte: '2026-11-06',
  dias_corte: 4,
  fecha_inicio_limpieza: null,
  fecha_fin_limpieza: null,
  dias_limpieza: 1,
  dias_total: 5,
  duracion_maxima_dias: 4,
  dias_limpieza_maximo: 1,
  maximo_total: 5,
  estado_duracion: 'Dentro del máximo',
  estado_limpieza: 'Cumplida',
  faltantes: [],
}

function cumplimiento(): ResultadoCumplimientoCorte {
  return {
    ...base,
    filtros_aplicados: {},
    indicador: null,
    ciclos: [ciclo],
    resumen: {
      total_ciclos: 1,
      por_estado_frecuencia: { 'Dentro de la frecuencia': 1 },
      por_estado_duracion: { 'Dentro del máximo': 1 },
    },
    ultimo_ciclo: ciclo,
  }
}

function distribucionVacia(): ResultadoDistribucionPersonal {
  return {
    ...base,
    sin_datos: true,
    mensaje_sin_datos: 'No hay partes de trabajo en el periodo.',
    filtros_aplicados: {},
    filas: [],
    totales_por_cuadrilla_jornada: [],
    cuadrillas_sin_parte: [],
    resumen: null,
  }
}

function Url() {
  return <output aria-label="url">{useLocation().search}</output>
}

function montar(entrada: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/n/reportes',
        element: (
          <>
            <Url />
            <ReportesPage />
          </>
        ),
      },
    ],
    { initialEntries: [entrada] },
  )
  render(<RouterProvider router={router} />)
}

beforeEach(() => {
  sesionActiva = sesion
  // jsdom no trae matchMedia: pantalla ancha y sin «reducir movimiento».
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    matches: false,
    media: consulta,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
  vi.mocked(obtenerCumplimientoCorte).mockResolvedValue(cumplimiento())
  vi.mocked(obtenerDistribucionPersonal).mockResolvedValue(distribucionVacia())
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('Reportes · informes de corte, personal y atenciones (RD-60)', () => {
  it('?informe= abre el informe en la misma vista, marca el elegido y consulta con el periodo de la URL', async () => {
    montar('/n/reportes?informe=cumplimiento-corte&desde=2026-11-01&hasta=2026-11-30')
    expect(
      await screen.findByRole('heading', {
        name: 'Cumplimiento del corte de césped',
      }),
    ).toBeTruthy()
    expect(await screen.findByText('Terraverde', { selector: 'td' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Cumplimiento del corte de césped' }).getAttribute('aria-current')).toBe(
      'page',
    )
    expect(vi.mocked(obtenerCumplimientoCorte).mock.calls[0][0]).toEqual({
      desde: '2026-11-01',
      hasta: '2026-11-30',
    })
    expect(obtenerPanel).not.toHaveBeenCalled()
  })

  it('el selector cambia de informe y conserva el periodo; «Panel» vuelve a las cifras', async () => {
    const usuario = userEvent.setup()
    montar('/n/reportes?informe=cumplimiento-corte&desde=2026-11-01&hasta=2026-11-30')
    await screen.findByText('Terraverde', { selector: 'td' })
    await usuario.click(screen.getByRole('link', { name: 'Distribución del personal' }))
    expect(await screen.findByText('Sin partes diarios en el periodo')).toBeTruthy()
    expect(screen.getByText('No hay partes de trabajo en el periodo.')).toBeTruthy()
    const url = screen.getByLabelText('url').textContent ?? ''
    expect(url).toContain('informe=distribucion-personal')
    expect(url).toContain('desde=2026-11-01')
    expect(vi.mocked(obtenerDistribucionPersonal).mock.calls[0][0]).toMatchObject({ desde: '2026-11-01' })

    vi.mocked(obtenerPanel).mockReturnValue(new Promise(() => undefined))
    await usuario.click(screen.getByRole('link', { name: 'Panel' }))
    await waitFor(() => expect(screen.getByLabelText('url').textContent).not.toContain('informe'))
    expect(screen.getByLabelText('url').textContent).toContain('desde=2026-11-01')
  })

  it('los filtros del informe viven en la URL y mandan sobre los predeterminados', async () => {
    montar('/n/reportes?informe=distribucion-personal&desde=2026-11-23&hasta=2026-11-29&cuadrilla_id=4')
    expect(await screen.findByText('Sin partes diarios en el periodo')).toBeTruthy()
    expect(vi.mocked(obtenerDistribucionPersonal).mock.calls[0][0]).toMatchObject({ desde: '2026-11-23' })
    expect(vi.mocked(obtenerDistribucionPersonal).mock.calls[0][1]).toMatchObject({ cuadrilla_id: 4 })
  })

  it('un error del servidor ofrece reintentar', async () => {
    const usuario = userEvent.setup()
    vi.mocked(obtenerAtencionesEspacioSector).mockRejectedValueOnce(new ErrorApi(500, null, 'El servidor no responde'))
    vi.mocked(obtenerAtencionesEspacioSector).mockResolvedValue({
      ...base,
      sin_datos: true,
      mensaje_sin_datos: 'Sin atenciones en el periodo.',
      filtros_aplicados: {},
      sectores: [],
      resumen: null,
    } as never)
    montar('/n/reportes?informe=atenciones-espacio-sector&desde=2026-11-01&hasta=2026-11-30')
    expect(await screen.findByText('No se pudo cargar el reporte')).toBeTruthy()
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Sin atenciones en el periodo.')).toBeTruthy()
    expect(obtenerAtencionesEspacioSector).toHaveBeenCalledTimes(2)
  })

  it('un 403 del informe muestra el aviso del servidor', async () => {
    vi.mocked(obtenerCumplimientoCorte).mockRejectedValue(
      new ErrorApi(403, null, 'No tienes permiso para ver este reporte'),
    )
    montar('/n/reportes?informe=cumplimiento-corte')
    expect(await screen.findByText('No tienes permiso para ver este reporte')).toBeTruthy()
  })

  it('sin el permiso no consulta ningún informe', () => {
    sesionActiva = { ...sesion, permisos: [] }
    montar('/n/reportes?informe=cumplimiento-corte')
    expect(screen.getByText('No tienes acceso a Reportes')).toBeTruthy()
    expect(obtenerCumplimientoCorte).not.toHaveBeenCalled()
  })
})
