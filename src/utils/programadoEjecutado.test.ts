import { describe, expect, it } from 'vitest'
import type { ComparacionPorServicio, EjecucionVinculada, FilaProgramadoEjecutado } from '../types/reportesGestion'
import {
  barrasPorServicio,
  consultaProgramado,
  contarPorSituacion,
  desviacionDias,
  filasDeBarra,
  mesesRecientes,
  ordenarPendientes,
  porServicioDe,
  promedioDesviacion,
  situacionDe,
  textoDesviacion,
} from './programadoEjecutado'

function ejecucion(inicio: string | null, fin: string | null): EjecucionVinculada {
  return { origen: 'Atencion', id: 1, codigo: 'AT-1', estado: 'x', etiqueta_estado: 'x', inicio_real: inicio, fin_real: fin }
}

function fila(cambios: Partial<FilaProgramadoEjecutado>): FilaProgramadoEjecutado {
  return {
    programacion_id: 1,
    tipo_servicio: 'Corte de césped',
    modalidad: 'Tercerizado',
    responsable: null,
    espacio: null,
    ventana_mes: null,
    inicio_previsto: '2026-10-01',
    fin_previsto: '2026-10-03',
    estado_programacion: 'Programada',
    ejecuciones: [],
    situacion: 'Pendiente',
    etiqueta_situacion: 'Pendiente',
    desviacion_dias: null,
    ...cambios,
  }
}

const PROGRAMADA = { estado_programacion: 'Programada' as const, fin_previsto: '2026-10-03' }

describe('desviacionDias', () => {
  it('cuenta en días de Lima', () => {
    // 4 oct. a las 02:00 UTC: en Lima aún es 3 de octubre.
    expect(desviacionDias('2026-10-03', '2026-10-04T02:00:00Z')).toBe(0)
    expect(desviacionDias('2026-10-03', '2026-10-05T18:00:00-05:00')).toBe(2)
    expect(desviacionDias('2026-10-03', '2026-10-02T10:00:00-05:00')).toBe(-1)
    expect(desviacionDias('2026-10-03', null)).toBeNull()
  })
})

describe('situacionDe', () => {
  it('aplica la regla del ticket con tolerancia 0', () => {
    expect(situacionDe({ ...PROGRAMADA, estado_programacion: 'Cancelada' }, [ejecucion('2026-10-01T08:00:00-05:00', null)]).situacion).toBe('Cancelado')
    expect(situacionDe(PROGRAMADA, [ejecucion('2026-10-01T08:00:00-05:00', '2026-10-03T12:00:00-05:00')])).toEqual({
      situacion: 'Ejecutado',
      desviacion_dias: 0,
    })
    expect(situacionDe(PROGRAMADA, [ejecucion('2026-10-02T08:00:00-05:00', '2026-10-06T12:00:00-05:00')])).toEqual({
      situacion: 'EjecutadoConDesviacion',
      desviacion_dias: 3,
    })
    expect(situacionDe(PROGRAMADA, [ejecucion('2026-10-02T08:00:00-05:00', null)]).situacion).toBe('EnCurso')
    expect(situacionDe(PROGRAMADA, []).situacion).toBe('Pendiente')
    expect(situacionDe(PROGRAMADA, [ejecucion(null, null)]).situacion).toBe('Pendiente')
  })
})

describe('chips, pendientes y textos', () => {
  const filas = [
    fila({ programacion_id: 1, situacion: 'Pendiente', fin_previsto: '2026-10-20' }),
    fila({ programacion_id: 2, situacion: 'Pendiente', fin_previsto: '2026-10-05' }),
    fila({ programacion_id: 3, situacion: 'Pendiente', fin_previsto: '2026-11-10' }),
    fila({ programacion_id: 4, situacion: 'EjecutadoConDesviacion', desviacion_dias: 2 }),
    fila({ programacion_id: 5, situacion: 'EjecutadoConDesviacion', desviacion_dias: 5 }),
    fila({ programacion_id: 6, situacion: 'Ejecutado', desviacion_dias: 0 }),
  ]

  it('contarPorSituacion', () => {
    expect(contarPorSituacion(filas)).toEqual({ Ejecutado: 1, EjecutadoConDesviacion: 2, EnCurso: 0, Pendiente: 3, Cancelado: 0 })
  })

  it('ordenarPendientes pone los vencidos primero y por fin previsto', () => {
    expect(ordenarPendientes(filas, '2026-11-01').map((f) => f.programacion_id)).toEqual([2, 1, 3])
  })

  it('textoDesviacion y promedioDesviacion', () => {
    expect(textoDesviacion(3)).toBe('+3 días')
    expect(textoDesviacion(1)).toBe('+1 día')
    expect(textoDesviacion(0)).toBe('En plazo')
    expect(textoDesviacion(-2)).toBe('En plazo')
    expect(textoDesviacion(null)).toBe('—')
    expect(promedioDesviacion(filas)).toBe(3.5)
    expect(promedioDesviacion([])).toBeNull()
  })
})

describe('mesesRecientes', () => {
  it('el mes en curso hasta hoy y los anteriores completos, en Lima', () => {
    const meses = mesesRecientes(3, new Date('2026-03-01T03:00:00Z')) // en Lima, 28 de febrero
    expect(meses.map((m) => [m.valor, m.desde, m.hasta])).toEqual([
      ['2026-02', '2026-02-01', '2026-02-28'],
      ['2026-01', '2026-01-01', '2026-01-31'],
      ['2025-12', '2025-12-01', '2025-12-31'],
    ])
    expect(meses[0].texto).toBe('Este mes')
    expect(meses[1].texto).toBe('ene. 2026')
  })
})

describe('consultaProgramado', () => {
  it('envía los mismos filtros válidos para los dos conjuntos', () => {
    expect(
      consultaProgramado({ desde: '2026-10-01', hasta: '2026-10-31', tipo_servicio_id: '3', area_verde_id: '', modalidad: 'Otra' }),
    ).toEqual({ desde: '2026-10-01', hasta: '2026-10-31', tipo_servicio_id: 3, area_verde_id: undefined, modalidad: undefined })
  })
})

describe('barrasPorServicio', () => {
  it('cada servicio va seguido de sus ejecutados y pendientes', () => {
    const servicios: ComparacionPorServicio[] = [
      { tipo_servicio_id: 1, tipo_servicio: 'Corte', modalidad: 'Tercerizado', programados: 2, ejecutados: 1, pendientes: 1 },
      { tipo_servicio_id: 2, tipo_servicio: 'Poda', modalidad: 'Tercerizado', programados: 5, ejecutados: 4, pendientes: 0 },
    ]
    expect(barrasPorServicio(servicios).map((b) => b.clave)).toEqual(['2', '2|ejecutados', '2|pendientes', '1', '1|ejecutados', '1|pendientes'])
  })
})

describe('filasDeBarra', () => {
  const servicios: ComparacionPorServicio[] = [
    { tipo_servicio_id: 1, tipo_servicio: 'Corte de césped', modalidad: 'Tercerizado', programados: 3, ejecutados: 2, pendientes: 1 },
  ]
  const filas = [
    fila({ programacion_id: 1, situacion: 'Ejecutado' }),
    fila({ programacion_id: 2, situacion: 'EjecutadoConDesviacion' }),
    fila({ programacion_id: 3, situacion: 'Pendiente' }),
    fila({ programacion_id: 4, tipo_servicio: 'Poda', situacion: 'Pendiente' }),
  ]
  const ids = (clave: string) => filasDeBarra(filas, servicios, clave)?.filas.map((f) => f.programacion_id)

  it('devuelve los trabajos del servicio, sus ejecutados o sus pendientes', () => {
    expect(ids('1')).toEqual([1, 2, 3])
    expect(ids('1|ejecutados')).toEqual([1, 2])
    expect(ids('1|pendientes')).toEqual([3])
    expect(filasDeBarra(filas, servicios, '1|pendientes')?.titulo).toBe('Corte de césped: pendientes')
    expect(filasDeBarra(filas, servicios, '9')).toBeNull()
  })
})

describe('porServicioDe', () => {
  it('recalcula el gráfico con las filas filtradas y quita los servicios vacíos', () => {
    const servicios: ComparacionPorServicio[] = [
      { tipo_servicio_id: 1, tipo_servicio: 'Corte de césped', modalidad: 'Tercerizado', programados: 9, ejecutados: 9, pendientes: 0 },
      { tipo_servicio_id: 2, tipo_servicio: 'Poda', modalidad: 'Tercerizado', programados: 4, ejecutados: 4, pendientes: 0 },
    ]
    const filas = [fila({ situacion: 'Pendiente' }), fila({ situacion: 'Pendiente' })]
    expect(porServicioDe(filas, servicios)).toEqual([{ ...servicios[0], programados: 2, ejecutados: 0, pendientes: 2 }])
  })
})
