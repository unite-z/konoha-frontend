// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import { obtenerDetalleIndicador, obtenerPanel } from '@/services/api/reportesGestion'
import type { SesionCore } from '@/types/core'
import type {
  DetalleIndicadorPanel,
  FilaAtencionEspacio,
  ResultadoIndicador,
  ResultadoPanel,
} from '@/types/reportesGestion'
import { semanaActual } from '@/utils/formato'
import ReportesPage from './ReportesPage'

const sesion: SesionCore = {
  usuario: { id: 1, nombre: 'Marta', nombre_usuario: 'marta' },
  rol: { codigo: 'jefe-seccion', nombre: 'Jefe' },
  permisos: ['REP.INDICADOR.CONSULTAR'],
  debe_cambiar_contrasena: false,
  expira: null,
}
let sesionActiva: SesionCore | null = sesion

vi.mock('@/sesion/ContextoSesion', () => ({ useSesionActiva: () => sesionActiva }))
vi.mock('@/sincronizacion/datosDescargados', () => ({
  conCache: (_: string, consultar: () => Promise<unknown>) => consultar(),
}))
vi.mock('@/components/reportes-indicadores/useCatalogosFiltros', () => ({
  useCatalogosFiltros: () => ({ espacios: [], tiposServicio: [], reintentar: () => {} }),
}))
vi.mock('@/services/api/reportesGestion', () => ({ obtenerPanel: vi.fn(), obtenerDetalleIndicador: vi.fn() }))

const NOMBRES: [ResultadoIndicador['clave'], string, string, string | null][] = [
  ['actividades-por-estado', 'Actividades por estado', 'actividades', '14'],
  ['distribucion-operarios', 'Distribución de operarios', 'operarios', '9'],
  ['atenciones-por-espacio', 'Atenciones por espacio', 'atenciones', '12'],
  ['consumo-materiales', 'Consumo de materiales', 'kg', null],
  ['cumplimiento-tercerizados', 'Cumplimiento de tercerizados', '%', '66.67'],
]

function panelDe(sinDatos = false, notas: string[] = []): ResultadoPanel {
  return {
    periodo: { desde: '2026-11-23', hasta: '2026-11-29' },
    filtros_aplicados: {
      desde: '2026-11-23',
      hasta: '2026-11-29',
      area_verde_id: null,
      tipo_servicio_id: null,
      estado: null,
      modalidad: null,
    },
    generado_en: '2026-11-26T15:00:00Z',
    sin_datos: sinDatos,
    mensaje_sin_datos: sinDatos ? 'No hay actividad en la semana.' : null,
    notas,
    indicadores: NOMBRES.map(([clave, nombre, unidad, valor]) => ({
      clave,
      indicador: { codigo: clave, nombre, descripcion_calculo: `Cálculo de ${nombre}`, meta: null, unidad },
      valor,
      sin_datos: valor === null,
      mensaje_sin_datos: valor === null ? 'Sin movimientos de material' : null,
      desglose: valor === null ? [] : [{ etiqueta: 'Jardín Central', valor }],
      notas: [],
    })),
  }
}

const fila: FilaAtencionEspacio = {
  atencion_id: 5,
  codigo: 'ATN-005',
  tipo_servicio: 'Poda',
  estado: 'Programada',
  fecha: '2026-11-24',
  area_verde_id: 3,
  espacio: 'Jardín Central',
}

function detalle(): DetalleIndicadorPanel<FilaAtencionEspacio> {
  const base = panelDe()
  return {
    periodo: base.periodo,
    filtros_aplicados: base.filtros_aplicados,
    generado_en: base.generado_en,
    sin_datos: false,
    mensaje_sin_datos: null,
    indicador: base.indicadores[2].indicador,
    count: 1,
    next: null,
    previous: null,
    results: [fila],
    notas: [],
  }
}

/** La cifra (con su valor) y no el informe «Atenciones por espacio y sector». */
const CIFRA_ATENCIONES = 'Atenciones por espacio 12 atenciones Ver detalle'

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
            <ReportesPage />
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
  sesionActiva = sesion
  vi.mocked(obtenerPanel).mockResolvedValue(panelDe())
  vi.mocked(obtenerDetalleIndicador).mockResolvedValue(detalle())
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Reportes · cifras, filtros y detalle (RD-59)', () => {
  it('con permiso muestra las cinco cifras, consulta la semana actual y el resumen calculado', async () => {
    montar()
    expect(await screen.findByRole('link', { name: CIFRA_ATENCIONES })).toBeTruthy()
    expect(screen.getAllByRole('link', { name: /Ver detalle/ })).toHaveLength(5)
    expect(screen.getByText('Sin datos')).toBeTruthy()
    expect(vi.mocked(obtenerPanel).mock.calls[0][0]).toMatchObject(semanaActual())

    const resumen = screen.getByRole('region', { name: 'Resumen del periodo' })
    expect(within(resumen).getByText('Calculado con las cifras de arriba')).toBeTruthy()
    expect(within(resumen).getByText('Sin datos en el periodo: Consumo de materiales.')).toBeTruthy()
    expect(screen.queryByText(/Konoha|IA/)).toBeNull()
  })

  it('los filtros de la URL mandan sobre la semana actual', async () => {
    montar('/n/reportes?desde=2026-11-01&hasta=2026-11-07&estado=Programada')
    await screen.findByRole('link', { name: CIFRA_ATENCIONES })
    expect(vi.mocked(obtenerPanel).mock.calls[0][0]).toMatchObject({
      desde: '2026-11-01',
      hasta: '2026-11-07',
      estado: 'Programada',
    })
  })

  it('al elegir una cifra abre su panel con gráfico y tabla completa, y conserva los filtros', async () => {
    const usuario = userEvent.setup()
    montar('/n/reportes?desde=2026-11-23&hasta=2026-11-29')
    await usuario.click(await screen.findByRole('link', { name: CIFRA_ATENCIONES }))

    const panel = await screen.findByRole('complementary', { name: 'Atenciones por espacio' })
    expect(screen.getByLabelText('url').textContent).toContain('indicador=atenciones-por-espacio')
    expect(screen.getByLabelText('url').textContent).toContain('desde=2026-11-23')
    expect(await within(panel).findByText('Cálculo de Atenciones por espacio')).toBeTruthy()
    expect(await within(panel).findByRole('link', { name: 'ATN-005' })).toBeTruthy()
    expect(vi.mocked(obtenerDetalleIndicador).mock.calls[0][0]).toBe('atenciones-por-espacio')

    await usuario.click(within(panel).getByRole('button', { name: 'Cerrar panel' }))
    await waitFor(() => expect(screen.queryByRole('complementary')).toBeNull())
    expect(screen.getByLabelText('url').textContent).not.toContain('indicador')
  })

  it('una clave desconocida muestra «No existe ese indicador» sin consultar', async () => {
    montar('/n/reportes?indicador=inventado')
    expect(await screen.findByText('No existe ese indicador')).toBeTruthy()
    expect(obtenerDetalleIndicador).not.toHaveBeenCalled()
  })

  it('un 404 del detalle también dice que no existe', async () => {
    vi.mocked(obtenerDetalleIndicador).mockRejectedValue(new ErrorApi(404, 'indicador-no-encontrado', 'No existe'))
    montar('/n/reportes?indicador=consumo-materiales')
    expect(await screen.findByText('No existe ese indicador')).toBeTruthy()
  })

  it('sin datos en el periodo muestra el vacío con el motivo', async () => {
    vi.mocked(obtenerPanel).mockResolvedValue(panelDe(true, ['Cuadrilla y sector aún no se pueden filtrar.']))
    montar()
    expect(await screen.findByText('Sin datos en el periodo')).toBeTruthy()
    expect(screen.getByText('No hay actividad en la semana.')).toBeTruthy()
    // Las notas del back-end que explican el vacío se siguen viendo, como en el panel actual.
    expect(screen.getByText('Cuadrilla y sector aún no se pueden filtrar.')).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Resumen del periodo' })).toBeNull()
  })

  it('un error del servidor ofrece reintentar y conserva los filtros', async () => {
    const usuario = userEvent.setup()
    vi.mocked(obtenerPanel).mockRejectedValueOnce(new ErrorApi(500, null, 'El servidor no responde'))
    montar('/n/reportes?desde=2026-11-01&hasta=2026-11-07')
    expect(await screen.findByText('No se pudo cargar el reporte')).toBeTruthy()
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('link', { name: CIFRA_ATENCIONES })).toBeTruthy()
    expect(vi.mocked(obtenerPanel).mock.calls[1][0]).toMatchObject({ desde: '2026-11-01' })
  })

  it('un 403 del servidor muestra el aviso de acceso', async () => {
    vi.mocked(obtenerPanel).mockRejectedValue(new ErrorApi(403, null, 'No tienes permiso para consultar indicadores'))
    montar()
    expect(await screen.findByText('No tienes permiso para consultar indicadores')).toBeTruthy()
  })

  it('sin el permiso no consulta y dice que no hay acceso', () => {
    sesionActiva = { ...sesion, permisos: [] }
    montar()
    expect(screen.getByText('No tienes acceso a Reportes')).toBeTruthy()
    expect(obtenerPanel).not.toHaveBeenCalled()
  })

  it('el selector de informe conserva los filtros y abre el informe elegido', async () => {
    const usuario = userEvent.setup()
    montar('/n/reportes?desde=2026-11-23&hasta=2026-11-29')
    await usuario.click(await screen.findByRole('link', { name: /Material vegetal/ }))
    const panel = await screen.findByRole('complementary', { name: 'Material vegetal' })
    expect(screen.getByLabelText('url').textContent).toContain('informe=material-vegetal')
    expect(screen.getByLabelText('url').textContent).toContain('desde=2026-11-23')
    // Hasta RD-61, el panel lleva a la pantalla actual del informe: no se pierde.
    expect(within(panel).getByRole('link', { name: 'Abrir el informe' }).getAttribute('href')).toBe(
      '/reportes-indicadores/reportes/material-vegetal',
    )

    await usuario.click(within(panel).getByRole('button', { name: 'Cerrar panel' }))
    await waitFor(() => expect(screen.queryByRole('complementary')).toBeNull())
    expect(screen.getByLabelText('url').textContent).toBe('?desde=2026-11-23&hasta=2026-11-29')
  })
})
