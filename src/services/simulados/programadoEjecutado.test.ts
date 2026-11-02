import { afterEach, describe, expect, it, vi } from 'vitest'
import { calcularProgramadoEjecutado } from './programadoEjecutado'

const HOY = '2026-10-31'
const TODO = { desde: '2026-01-01', hasta: '2026-12-31' }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('calcularProgramadoEjecutado (datos simulados de RF-REP-010)', () => {
  it('reparte las 40 programaciones como pide el ticket', () => {
    const { resumen, filas, sin_programacion } = calcularProgramadoEjecutado(TODO, HOY)
    expect(filas).toHaveLength(40)
    expect(resumen).toMatchObject({ ejecutados: 24, ejecutados_con_desviacion: 4, en_curso: 4, pendientes: 6, cancelados: 2 })
    expect(resumen.porcentaje_cumplimiento).toBe('73.7')
    expect(sin_programacion).toHaveLength(3)
  })

  it('aplica los filtros a programaciones y ejecuciones por igual (criterio 3)', () => {
    const corte = calcularProgramadoEjecutado({ ...TODO, tipo_servicio_id: 1 }, HOY)
    expect(corte.filas.every((f) => f.tipo_servicio === 'Corte de césped')).toBe(true)
    expect(corte.sin_programacion.map((e) => e.codigo)).toEqual(['AT-2026-0120'])
    expect(corte.por_servicio.map((s) => s.tipo_servicio_id)).toEqual([1])
    const propio = calcularProgramadoEjecutado({ ...TODO, modalidad: 'PersonalPropio' }, HOY)
    expect(propio.filas.every((f) => f.ejecuciones.every((e) => e.origen === 'Actividad'))).toBe(true)
    expect(propio.sin_programacion.every((e) => e.origen === 'Actividad')).toBe(true)
  })

  it('los pendientes no tienen ejecución y las desviaciones van de 1 a 6 días', () => {
    const { filas } = calcularProgramadoEjecutado(TODO, HOY)
    expect(filas.filter((f) => f.situacion === 'Pendiente').every((f) => f.ejecuciones.length === 0)).toBe(true)
    const desviaciones = filas.filter((f) => f.situacion === 'EjecutadoConDesviacion').map((f) => f.desviacion_dias ?? 0)
    expect(desviaciones.every((d) => d >= 1 && d <= 6)).toBe(true)
  })

  it('?simular=datos-insuficientes quita el personal propio; ?simular=vacio no tiene datos', () => {
    vi.stubGlobal('location', { search: '?simular=datos-insuficientes' })
    const sinPropio = calcularProgramadoEjecutado(TODO, HOY)
    expect(sinPropio.personal_propio.sin_datos).toBe(true)
    expect(sinPropio.filas.some((f) => f.modalidad === 'PersonalPropio')).toBe(false)
    vi.stubGlobal('location', { search: '?simular=vacio' })
    expect(calcularProgramadoEjecutado(TODO, HOY)).toMatchObject({ sin_datos: true, filas: [] })
  })
})
