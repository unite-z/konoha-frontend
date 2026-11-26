// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { PERMISOS } from '@/config/permisosCore'
import { sumarDias } from '@/pages/planificacion/resumen/resumenPlanificacion'
import { ErrorApi } from '@/services/api/cliente'
import type { AlertaPlanificacion, Programacion, Restriccion } from '@/types/planificacion'
import type { ResumenSectores } from '@/types/resumenSectores'
import { hoyLima } from '@/utils/instanteLima'
import SectoresPage from './SectoresPage'

const api = vi.hoisted(() => ({
  listarProgramaciones: vi.fn(),
  listarAlertas: vi.fn(),
  listarServiciosPeriodicos: vi.fn(),
  listarRestricciones: vi.fn(),
  registrarMotivoAlerta: vi.fn(),
  obtenerResumenSectores: vi.fn(),
  permisos: [] as string[],
}))
vi.mock('@/services/api/planificacion', () => ({
  listarProgramaciones: api.listarProgramaciones,
  listarAlertas: api.listarAlertas,
  listarServiciosPeriodicos: api.listarServiciosPeriodicos,
  listarRestricciones: api.listarRestricciones,
  registrarMotivoAlerta: api.registrarMotivoAlerta,
}))
vi.mock('@/services/api/resumenSectores', () => ({ obtenerResumenSectores: api.obtenerResumenSectores }))
vi.mock('@/sesion/ContextoSesion', () => ({ usePermisos: () => api.permisos }))

const hoy = hoyLima()
const LECTURA = [PERMISOS.consultarPlanificacion]
const JEFE = [PERMISOS.consultarPlanificacion, PERMISOS.gestionarPlanificacion]

const enCurso: Programacion = {
  id: 7,
  codigo: 'CC-2026-11',
  tipo_servicio_id: 1,
  servicio: 'Corte de césped',
  proveedor_id: null,
  proveedor: null,
  estacion: 'Primavera',
  fecha_inicio_prevista: sumarDias(hoy, -1),
  fecha_fin_prevista: sumarDias(hoy, 2),
  estado: 'EnCurso',
  fecha_inicio_real: sumarDias(hoy, -1),
  fecha_fin_real: null,
}
const proximo: Programacion = { ...enCurso, id: 8, codigo: 'CC-2026-12', estado: 'Programada', fecha_inicio_prevista: sumarDias(hoy, 10), fecha_fin_prevista: sumarDias(hoy, 12), fecha_inicio_real: null }
const alertas: AlertaPlanificacion[] = [
  { tipo: 'DuracionExcedida', servicio_id: 1, servicio: 'Poda mayor', programacion_id: 7, dias: 1, mensaje: '', id: 5 },
  { tipo: 'FrecuenciaProxima', servicio_id: 2, servicio: 'Riego', programacion_id: null, dias: -3, mensaje: '' },
]
const restriccion = { id: 1, tipo: 'Examen de admisión', efecto: 'Prohibicion', fecha_inicio: sumarDias(hoy, 2), fecha_fin: sumarDias(hoy, 2), serie: null } as Restriccion
const resumen: ResumenSectores = {
  ciclo_id: 7,
  desde: null,
  hasta: null,
  generado_en: '2026-11-26T15:00:00-05:00',
  sectores: [
    {
      sector_id: 1,
      sector: 'Ciencias',
      servicios: [
        { servicio: 'corte', programado: 4, ejecutado: 2, porcentaje: 50, actualizado_en: '2026-11-26T09:30:00-05:00' },
        { servicio: 'riego', programado: 2, ejecutado: 1, porcentaje: 50, actualizado_en: null },
        { servicio: 'poda', programado: 0, ejecutado: 0, porcentaje: 0, actualizado_en: null },
      ],
    },
  ],
}

function montar(ruta = '/n/planificacion') {
  const router = createMemoryRouter([{ path: '/n/planificacion', Component: SectoresPage }], { initialEntries: [ruta] })
  render(<RouterProvider router={router} />)
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
  api.permisos = JEFE
  api.listarProgramaciones.mockResolvedValue([enCurso, proximo])
  api.listarAlertas.mockResolvedValue(alertas)
  api.listarServiciosPeriodicos.mockResolvedValue([])
  api.listarRestricciones.mockResolvedValue([restriccion])
  api.obtenerResumenSectores.mockResolvedValue(resumen)
  api.registrarMotivoAlerta.mockResolvedValue({ id: 5, estado: 'Atendida', motivo: 'x' })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Sectores · jefe', () => {
  it('muestra el avance con su hora, la tabla con corte, riego y poda y no carga el mapa', async () => {
    montar()
    expect(await screen.findByRole('heading', { name: 'Sectores', level: 1 })).toBeTruthy()
    const avance = await screen.findByRole('region', { name: 'Avance del ciclo' })
    await waitFor(() => expect(within(avance).getByText('50 %')).toBeTruthy())
    expect(within(avance).getByText('Actualizado a las 15:00')).toBeTruthy()
    expect(within(avance).getByRole('link', { name: /Ver el ciclo CC-2026-11/ }).getAttribute('href')).toBe('/n/planificacion/ciclos?ciclo=7')
    const tabla = await screen.findByRole('table', { name: 'Avance por sector' })
    expect(within(tabla).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(expect.arrayContaining(['Sector', 'Corte', 'Riego', 'Poda']))
    expect(within(tabla).getByText('Ciencias')).toBeTruthy()
    expect(within(tabla).getByText('Sin programar')).toBeTruthy()
    expect(document.querySelector('canvas')).toBeNull()
    expect(api.obtenerResumenSectores).toHaveBeenCalledWith(7, expect.anything())
  })

  it('«Necesita atención» ofrece «Registrar motivo» y «Programar», y atiende la alerta', async () => {
    montar()
    const bandeja = await screen.findByRole('region', { name: 'Necesita atención' })
    const programar = await within(bandeja).findByRole('link', { name: /Programar/ })
    expect(programar.getAttribute('href')).toBe('/n/planificacion?programar=2')
    await userEvent.click(within(bandeja).getByRole('button', { name: /Registrar motivo/ }))
    await userEvent.type(await screen.findByLabelText(/Motivo o acción/), 'Lluvia')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(api.registrarMotivoAlerta).toHaveBeenCalledWith(5, 'Lluvia'))
    await waitFor(() => expect(within(bandeja).queryByRole('button', { name: /Registrar motivo/ })).toBeNull())
  })

  it('«Esta semana» se amplía a 14 días y suma el ciclo del día 10', async () => {
    montar()
    const semana = await screen.findByRole('region', { name: 'Esta semana' })
    await waitFor(() => expect(within(semana).getByText('Examen de admisión')).toBeTruthy())
    expect(within(semana).queryByText(/CC-2026-12/)).toBeNull()
    expect(within(semana).getAllByRole('listitem')).toHaveLength(2)
    await userEvent.click(within(semana).getByRole('button', { name: 'Ampliar a 14 días' }))
    const ampliada = await screen.findByRole('region', { name: 'Próximos 14 días' })
    expect(within(ampliada).getAllByRole('listitem')).toHaveLength(3)
  })

  it('elige otro ciclo y lo guarda en la URL', async () => {
    montar()
    await userEvent.selectOptions(await screen.findByLabelText('Ciclo'), '8')
    await waitFor(() => expect(api.obtenerResumenSectores).toHaveBeenCalledWith(8, expect.anything()))
  })
})

describe('Sectores · ingeniería, practicantes y capataz (solo lectura)', () => {
  it('lo ve todo, sin «Registrar motivo» ni «Programar»', async () => {
    api.permisos = LECTURA
    montar()
    const bandeja = await screen.findByRole('region', { name: 'Necesita atención' })
    await within(bandeja).findByText(/Poda mayor/)
    expect(within(bandeja).queryByRole('button', { name: /Registrar motivo/ })).toBeNull()
    expect(within(bandeja).queryByRole('link', { name: /Programar/ })).toBeNull()
    expect(within(bandeja).getAllByRole('link', { name: /Ver ciclo/ })).toHaveLength(2)
    expect(await screen.findByRole('table', { name: 'Avance por sector' })).toBeTruthy()
  })
})

describe('Sectores · con y sin avance por sector (RD-15)', () => {
  it('solo con corte, la tabla solo tiene la columna de corte', async () => {
    api.obtenerResumenSectores.mockResolvedValue({ ...resumen, sectores: [{ ...resumen.sectores[0], servicios: [resumen.sectores[0].servicios[0]] }] })
    montar()
    const tabla = await screen.findByRole('table', { name: 'Avance por sector' })
    const cabeceras = within(tabla).getAllByRole('columnheader').map((c) => c.textContent ?? '')
    expect(cabeceras.some((c) => c.includes('Corte'))).toBe(true)
    expect(cabeceras.some((c) => c.includes('Riego'))).toBe(false)
  })

  it('sin el endpoint (404) avisa y sigue con el avance en días', async () => {
    api.obtenerResumenSectores.mockRejectedValue(new ErrorApi(404, null, 'No existe'))
    montar()
    expect(await screen.findByText('Avance por sector aún no disponible')).toBeTruthy()
    const avance = screen.getByRole('region', { name: 'Avance del ciclo' })
    expect(within(avance).getByText('Avance en días del ciclo')).toBeTruthy()
    expect(screen.queryByText('No pudimos cargar el avance por sector')).toBeNull()
    expect(screen.getByRole('region', { name: 'Necesita atención' })).toBeTruthy()
  })

  it('un error del resumen se puede reintentar', async () => {
    api.obtenerResumenSectores.mockRejectedValueOnce(new ErrorApi(500, null, 'Fallo del servidor'))
    montar()
    expect(await screen.findByText('No pudimos cargar el avance por sector')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('table', { name: 'Avance por sector' })).toBeTruthy()
  })
})

describe('Sectores · estados', () => {
  it('sin ciclos, vacío', async () => {
    api.listarProgramaciones.mockResolvedValue([])
    api.listarAlertas.mockResolvedValue([])
    montar()
    expect(await screen.findByText('Sin ciclos')).toBeTruthy()
    expect(await screen.findByText('Todo al día')).toBeTruthy()
    expect(api.obtenerResumenSectores).not.toHaveBeenCalled()
  })

  it('error de las programaciones con «Reintentar»', async () => {
    api.listarProgramaciones.mockRejectedValueOnce(new ErrorApi(500, null, 'Fallo del servidor'))
    montar()
    expect(await screen.findByText('No pudimos cargar la planificación')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('heading', { name: 'Sectores', level: 1 })).toBeTruthy()
  })

  it('sin el permiso de consulta no consulta nada', () => {
    api.permisos = []
    montar()
    expect(screen.getByRole('heading', { name: 'No tienes acceso a Planificación' })).toBeTruthy()
    expect(api.listarProgramaciones).not.toHaveBeenCalled()
  })

  it('un 403 del servidor muestra «sin acceso»', async () => {
    api.listarProgramaciones.mockRejectedValue(new ErrorApi(403, null, 'Prohibido'))
    montar()
    expect(await screen.findByRole('heading', { name: 'No tienes acceso a Planificación' })).toBeTruthy()
  })
})
