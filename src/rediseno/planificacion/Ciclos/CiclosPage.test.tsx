// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { PERMISOS } from '@/config/permisosCore'
import { sumarDias } from '@/pages/planificacion/resumen/resumenPlanificacion'
import { ErrorApi } from '@/services/api/cliente'
import type { Programacion } from '@/types/planificacion'
import type { ResumenSectores } from '@/types/resumenSectores'
import { hoyLima } from '@/utils/instanteLima'
import CiclosPage from './CiclosPage'
import { rutaPlanificacionCiclo, rutaPlanificacionCiclos } from '../enlaces'

const api = vi.hoisted(() => ({
  listarProgramaciones: vi.fn(),
  obtenerProgramacion: vi.fn(),
  listarServiciosPeriodicos: vi.fn(),
  listarRestricciones: vi.fn(),
  cambiarEstadoCiclo: vi.fn(),
  obtenerResumenSectores: vi.fn(),
  obtenerCicloCorte: vi.fn(),
  permisos: [] as string[],
}))
vi.mock('@/services/api/planificacion', () => ({
  listarProgramaciones: api.listarProgramaciones,
  obtenerProgramacion: api.obtenerProgramacion,
  listarServiciosPeriodicos: api.listarServiciosPeriodicos,
  listarRestricciones: api.listarRestricciones,
  cambiarEstadoCiclo: api.cambiarEstadoCiclo,
}))
vi.mock('@/services/api/resumenSectores', () => ({ obtenerResumenSectores: api.obtenerResumenSectores }))
vi.mock('@/services/api/corte', () => ({ obtenerCicloCorte: api.obtenerCicloCorte }))
vi.mock('@/sesion/ContextoSesion', () => ({ usePermisos: () => api.permisos }))

const hoy = hoyLima()
const LECTURA = [PERMISOS.consultarPlanificacion]
const JEFE = [PERMISOS.consultarPlanificacion, PERMISOS.gestionarPlanificacion]

const enCurso: Programacion = {
  id: 7,
  codigo: 'CC-2026-11',
  tipo_servicio_id: 1,
  servicio: 'Poda mayor',
  proveedor_id: null,
  proveedor: null,
  estacion: 'Primavera',
  fecha_inicio_prevista: sumarDias(hoy, -1),
  fecha_fin_prevista: sumarDias(hoy, 2),
  estado: 'EnCurso',
  fecha_inicio_real: sumarDias(hoy, -1),
  fecha_fin_real: null,
  historial: [{ estado: 'EnCurso', fecha_hora: `${sumarDias(hoy, -1)}T08:00:00-05:00`, autor: 'Robert G.' }],
  requerimiento: { id: 41, codigo: 'AT-1a2b3c4d-0000', estado: 'Pendiente' },
}
const proximo: Programacion = {
  ...enCurso,
  id: 8,
  codigo: 'CC-2026-12',
  estado: 'Programada',
  fecha_inicio_prevista: sumarDias(hoy, 10),
  fecha_fin_prevista: sumarDias(hoy, 12),
  fecha_inicio_real: null,
  historial: [],
  requerimiento: null,
}
const completado: Programacion = {
  ...enCurso,
  id: 9,
  codigo: 'CC-2026-10',
  estado: 'Completada',
  fecha_inicio_prevista: sumarDias(hoy, -30),
  fecha_fin_prevista: sumarDias(hoy, -28),
  fecha_inicio_real: sumarDias(hoy, -30),
  fecha_fin_real: sumarDias(hoy, -28),
}
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
        { servicio: 'poda', programado: 4, ejecutado: 2, porcentaje: 50, actualizado_en: '2026-11-26T09:30:00-05:00' },
      ],
    },
  ],
}

function montar(ruta = rutaPlanificacionCiclos()) {
  const router = createMemoryRouter([{ path: '/n/planificacion/ciclos', Component: CiclosPage }], {
    initialEntries: [ruta],
  })
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
  api.permisos = JEFE
  api.listarProgramaciones.mockResolvedValue([enCurso, proximo, completado])
  api.obtenerProgramacion.mockImplementation((id: number) =>
    Promise.resolve([enCurso, proximo, completado].find((c) => c.id === id)),
  )
  api.listarServiciosPeriodicos.mockResolvedValue([])
  api.listarRestricciones.mockResolvedValue([])
  api.obtenerResumenSectores.mockResolvedValue(resumen)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Ciclos (RD-29)', () => {
  it('lista los ciclos con contadores por estado y filtra por pestaña', async () => {
    montar()
    expect(await screen.findByRole('heading', { name: 'Ciclos', level: 1 })).toBeTruthy()
    expect(await screen.findByRole('tab', { name: 'Todos 3' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Programados 1' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'En curso 1' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Completados 1' })).toBeTruthy()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)

    await userEvent.click(screen.getByRole('tab', { name: 'Programados 1' }))
    const filas = screen.getAllByRole('listitem')
    expect(filas).toHaveLength(1)
    expect(within(filas[0]).getByText('CC-2026-12')).toBeTruthy()
  })

  it('la pestaña va en `?estado=` y se abre con ella', async () => {
    const router = montar(`${rutaPlanificacionCiclos()}?estado=enCurso`)
    const activa = await screen.findByRole('tab', { name: 'En curso 1' })
    expect(activa.getAttribute('aria-selected')).toBe('true')
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('CC-2026-11')).toBeTruthy()

    await userEvent.click(screen.getByRole('tab', { name: 'Completados 1' }))
    expect(router.state.location.search).toBe('?estado=completados')
    await userEvent.click(screen.getByRole('tab', { name: 'Todos 3' }))
    expect(router.state.location.search).toBe('')
  })

  it('consulta ±6 meses', async () => {
    montar()
    await screen.findByRole('tab', { name: 'Todos 3' })
    expect(api.listarProgramaciones).toHaveBeenCalledWith(sumarDias(hoy, -180), sumarDias(hoy, 180), expect.anything())
  })

  it('el jefe ve «Programar ciclo» y las acciones de la fila; quien solo consulta, no', async () => {
    montar()
    expect(await screen.findByRole('link', { name: 'Programar ciclo' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Iniciar ciclo CC-2026-12' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Cancelar ciclo CC-2026-12' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Finalizar ciclo CC-2026-11' })).toBeTruthy()
    cleanup()

    api.permisos = LECTURA
    montar()
    await screen.findByRole('tab', { name: 'Todos 3' })
    expect(screen.queryByRole('link', { name: 'Programar ciclo' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Iniciar ciclo|Cancelar ciclo|Finalizar ciclo/ })).toBeNull()
  })

  it('abre el panel del ciclo con su avance, historial y requerimiento', async () => {
    montar(rutaPlanificacionCiclo(7))
    const panel = await screen.findByRole('complementary')
    expect(await within(panel).findByRole('heading', { name: 'CC-2026-11' })).toBeTruthy()
    expect(await within(panel).findByText('50 %')).toBeTruthy()
    expect(within(panel).getByRole('link', { name: /Requerimiento AT-/ })).toBeTruthy()
    await userEvent.click(within(panel).getByRole('tab', { name: 'Historial' }))
    expect(await within(panel).findByText(/Robert G\./)).toBeTruthy()
  })

  it('un clic en la fila abre el panel y «Cerrar» lo cierra', async () => {
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Abrir el ciclo CC-2026-12' }))
    const panel = await screen.findByRole('complementary')
    expect(within(panel).getByRole('heading', { name: 'CC-2026-12' })).toBeTruthy()
    await userEvent.click(within(panel).getByRole('button', { name: 'Cerrar panel' }))
    await waitFor(() => expect(screen.queryByRole('complementary')).toBeNull())
  })

  it('quien solo consulta ve el panel sin cambios de estado', async () => {
    api.permisos = LECTURA
    montar(rutaPlanificacionCiclo(8))
    const panel = await screen.findByRole('complementary')
    await within(panel).findByRole('heading', { name: 'CC-2026-12' })
    expect(within(panel).queryByRole('button', { name: /Iniciar ciclo|Cancelar ciclo/ })).toBeNull()
  })

  it('inicia un ciclo desde el panel con la fecha real de hoy', async () => {
    api.cambiarEstadoCiclo.mockResolvedValue({ ...proximo, estado: 'EnCurso', fecha_inicio_real: hoy })
    montar(rutaPlanificacionCiclo(8))
    const panel = await screen.findByRole('complementary')
    await userEvent.click(await within(panel).findByRole('button', { name: 'Iniciar ciclo' }))
    const dialogo = await screen.findByRole('dialog')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Iniciar ciclo' }))
    await waitFor(() => expect(api.cambiarEstadoCiclo).toHaveBeenCalledWith(8, 'inicio', hoy, undefined))
    expect(await screen.findByText('Ciclo iniciado.')).toBeTruthy()
  })

  it('un corte en curso con la ruta completa se cierra con «Cerrar ciclo»; incompleta, se finaliza', async () => {
    const corte = { ...enCurso, servicio: 'Corte de césped' }
    const jardin = { id: 1, codigo: 'J-001', nombre: 'Jardín 1', zona: 'Ciencias', marcado_en: null, marcado_por: null }
    api.listarProgramaciones.mockResolvedValue([corte])
    api.obtenerProgramacion.mockResolvedValue(corte)
    const cicloCorte = { programacion_id: 7, interrupciones: [], limpiezas: [], dias_interrupcion_descontados: 0 }
    api.obtenerCicloCorte.mockResolvedValue({
      ...cicloCorte,
      jardines: [{ ...jardin, estado: 'Cortado', detenido_por_interrupcion: false }],
    })
    montar(rutaPlanificacionCiclo(7))
    const panel = await screen.findByRole('complementary')
    expect(await within(panel).findByRole('button', { name: 'Cerrar ciclo' })).toBeTruthy()
    // En la fila no hay acción: el corte en curso se cierra desde su panel.
    expect(screen.queryByRole('button', { name: /Finalizar ciclo CC-2026-11/ })).toBeNull()
    cleanup()

    api.obtenerCicloCorte.mockResolvedValue({
      ...cicloCorte,
      jardines: [{ ...jardin, estado: 'Pendiente', detenido_por_interrupcion: false }],
    })
    montar(rutaPlanificacionCiclo(7))
    const otro = await screen.findByRole('complementary')
    await waitFor(() => expect(api.obtenerCicloCorte).toHaveBeenCalledTimes(2))
    expect(await within(otro).findByRole('button', { name: 'Finalizar ciclo' })).toBeTruthy()
    expect(within(otro).queryByRole('button', { name: 'Cerrar ciclo' })).toBeNull()
  })

  it('rechaza una fecha real futura', async () => {
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Iniciar ciclo CC-2026-12' }))
    const dialogo = await screen.findByRole('dialog')
    fireEvent.change(within(dialogo).getByLabelText(/Fecha de inicio real/), { target: { value: sumarDias(hoy, 3) } })
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Iniciar ciclo' }))
    expect(await within(dialogo).findByText('La fecha no puede ser posterior a hoy.')).toBeTruthy()
    expect(api.cambiarEstadoCiclo).not.toHaveBeenCalled()
  })

  it('cancelar exige el motivo y lo envía', async () => {
    api.cambiarEstadoCiclo.mockResolvedValue({ ...proximo, estado: 'Cancelada' })
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar ciclo CC-2026-12' }))
    const dialogo = await screen.findByRole('dialog')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar ciclo' }))
    expect(await within(dialogo).findByText('Escribe el motivo de la cancelación.')).toBeTruthy()
    expect(api.cambiarEstadoCiclo).not.toHaveBeenCalled()

    await userEvent.type(within(dialogo).getByLabelText(/Motivo/), 'Lluvia intensa')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar ciclo' }))
    await waitFor(() =>
      expect(api.cambiarEstadoCiclo).toHaveBeenCalledWith(8, 'cancelacion', undefined, 'Lluvia intensa'),
    )
    expect(await screen.findByText('Ciclo cancelado.')).toBeTruthy()
  })

  it('muestra el estado vacío', async () => {
    api.listarProgramaciones.mockResolvedValue([])
    montar()
    expect(await screen.findByText('Sin ciclos en esta pestaña')).toBeTruthy()
  })

  it('muestra el error con «Reintentar»', async () => {
    api.listarProgramaciones.mockRejectedValueOnce(new ErrorApi(500, 'error', 'Falló el servidor'))
    montar()
    expect(await screen.findByText('No pudimos cargar los ciclos')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('tab', { name: 'Todos 3' })).toBeTruthy()
  })

  it('sin permiso de consulta no consulta nada', async () => {
    api.permisos = []
    montar()
    expect(await screen.findByText('No tienes acceso a los ciclos')).toBeTruthy()
    expect(api.listarProgramaciones).not.toHaveBeenCalled()
  })

  it('con 403 del servidor muestra «sin acceso»', async () => {
    api.listarProgramaciones.mockRejectedValue(new ErrorApi(403, 'prohibido', 'No permitido'))
    montar()
    expect(await screen.findByText('No puedes ver los ciclos')).toBeTruthy()
  })

  it('un ciclo que no existe dice que no existe', async () => {
    api.obtenerProgramacion.mockRejectedValue(new ErrorApi(404, 'no-encontrado', 'No existe'))
    montar(rutaPlanificacionCiclo(999))
    const panel = await screen.findByRole('complementary')
    expect(await within(panel).findByText('No existe este ciclo')).toBeTruthy()
  })
})
