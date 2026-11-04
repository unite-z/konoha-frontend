import { describe, expect, it } from 'vitest'
import type { AlertaPlanificacion, Programacion, Restriccion, ServicioPeriodico } from '@/types/planificacion'
import {
  cajaFecha,
  elementosAtencion,
  indicadoresMes,
  limitesMes,
  nombreMes,
  periodoRestriccion,
  proximosCiclos,
  restriccionesAgrupadas,
  restriccionesProximas,
} from './resumenPlanificacion'

const HOY = '2026-11-04' // miércoles

function programacion(parcial: Partial<Programacion>): Programacion {
  return {
    id: 1,
    tipo_servicio_id: 1,
    servicio: 'Corte de césped',
    proveedor_id: null,
    proveedor: null,
    estacion: 'Primavera',
    fecha_inicio_prevista: HOY,
    fecha_fin_prevista: HOY,
    estado: 'Programada',
    fecha_inicio_real: null,
    fecha_fin_real: null,
    ...parcial,
  }
}

function restriccion(parcial: Partial<Restriccion>): Restriccion {
  return {
    id: 1,
    tipo_restriccion_id: 1,
    tipo: 'Examen de admisión',
    efecto: 'Prohibicion',
    aplica_servicios_ruidosos: true,
    fecha_inicio: HOY,
    fecha_fin: HOY,
    hora_inicio: null,
    hora_fin: null,
    area_verde_id: null,
    descripcion: null,
    serie: null,
    ...parcial,
  }
}

function alerta(parcial: Partial<AlertaPlanificacion>): AlertaPlanificacion {
  return { tipo: 'FrecuenciaProxima', servicio_id: 1, servicio: 'Corte de césped', programacion_id: null, dias: 7, mensaje: '', ...parcial }
}

describe('fechas del Resumen', () => {
  it('calcula los límites y el nombre del mes', () => {
    expect(limitesMes(HOY)).toEqual({ desde: '2026-11-01', hasta: '2026-11-30' })
    expect(limitesMes('2028-02-10').hasta).toBe('2028-02-29')
    expect(nombreMes(HOY)).toBe('Noviembre 2026')
  })

  it('escribe la caja de fecha y el periodo de una restricción sin rayas', () => {
    expect(cajaFecha('2026-11-03')).toEqual({ mes: 'NOV', dia: '03' })
    expect(periodoRestriccion('2026-11-05', '2026-11-05')).toBe('jue. 05 nov.')
    expect(periodoRestriccion('2026-11-23', '2026-11-28')).toBe('23 al 28 nov.')
    expect(periodoRestriccion('2026-11-30', '2026-12-02')).toBe('30 nov. al 02 dic.')
  })
})

describe('indicadoresMes', () => {
  it('cuenta ciclos, en curso, alertas y días con restricción del mes', () => {
    const indicadores = indicadoresMes(
      HOY,
      [
        programacion({ id: 1, fecha_inicio_prevista: '2026-11-03', fecha_fin_prevista: '2026-11-05' }),
        programacion({ id: 2, fecha_inicio_prevista: '2026-11-20', fecha_fin_prevista: '2026-11-22' }),
        programacion({ id: 3, estado: 'Cancelada', fecha_inicio_prevista: '2026-11-04' }),
        programacion({ id: 4, estado: 'EnCurso', servicio: 'Poda', fecha_inicio_prevista: '2026-10-28', fecha_fin_prevista: '2026-11-06', fecha_inicio_real: '2026-10-28' }),
      ],
      [alerta({}), alerta({ tipo: 'DuracionExcedida', programacion_id: 4 }), alerta({ tipo: 'Desconocida' })],
      [
        restriccion({ id: 1, fecha_inicio: '2026-11-15', fecha_fin: '2026-11-15' }),
        restriccion({ id: 2, efecto: 'Advertencia', fecha_inicio: '2026-11-29', fecha_fin: '2026-12-03' }),
      ],
    )
    expect(indicadores.map((i) => [i.etiqueta, i.valor, i.nota])).toEqual([
      ['Ciclos programados', 3, '2 esta semana'],
      ['En curso', 1, 'Poda'],
      ['Alertas', 2, '1 frecuencia por vencer'],
      ['Días con restricción', 3, '1 prohibición'],
    ])
    expect(indicadores[1].detalle).toBe('Desde el 28/10')
    expect(indicadores[2].detalle).toBe('1 duración excedida')
  })

  it('las alertas dicen las frecuencias vencidas y las duraciones por exceder (Figma 373-5370)', () => {
    const alertas = [alerta({ dias: -2 }), alerta({ tipo: 'DuracionExcedida', programacion_id: 4 }), alerta({ tipo: 'DuracionProxima', programacion_id: 5 })]
    const [, , indicador] = indicadoresMes(HOY, [], alertas, [])
    expect([indicador.valor, indicador.nota, indicador.detalle]).toEqual([3, '1 frecuencia vencida', '1 excedida · 1 por exceder'])
  })
})

describe('elementosAtencion', () => {
  const servicios: ServicioPeriodico[] = [
    { id: 9, nombre: 'Control fitosanitario', es_ruidoso: false, frecuencias: [], duracion: null },
    {
      id: 1,
      nombre: 'Corte de césped',
      es_ruidoso: true,
      frecuencias: [],
      duracion: { duracion_maxima_dias: 3, dias_limpieza: 1, hora_inicio: null, hora_fin: null, fecha_modificacion: '2026-10-01T10:00:00-05:00', modificado_por: 'jefe' },
    },
  ]

  it('da a cada tipo su acción, pone primero lo excedido y descarta los tipos desconocidos', () => {
    const elementos = elementosAtencion(
      [alerta({ dias: 7 }), alerta({ tipo: 'DuracionExcedida', servicio: 'Poda mayor', programacion_id: 4, dias: 1 }), alerta({ tipo: 'Otro' })],
      servicios,
    )
    expect(elementos.map((e) => [e.titulo, e.accion, e.tono])).toEqual([
      ['Poda mayor · duración excedida en 1 día', 'verCiclo', 'error'],
      ['Corte de césped · faltan 7 días para la frecuencia máxima', 'programar', 'aviso'],
      ['Control fitosanitario · sin duración configurada', 'configurar', 'info'],
    ])
  })

  it('marca como error la frecuencia ya vencida y pinta la duración próxima cuando llegue', () => {
    const elementos = elementosAtencion(
      [alerta({ dias: -2 }), alerta({ tipo: 'DuracionProxima', servicio: 'Poda', programacion_id: 5, dias: 1 })],
      [],
    )
    expect(elementos.map((e) => [e.titulo, e.detalle, e.tono])).toEqual([
      ['Corte de césped · frecuencia vencida', 'Superó su máximo hace 2 días · sin ciclo programado', 'error'],
      ['Poda · mañana supera su máximo', 'Ciclo en curso', 'aviso'],
    ])
  })

  it('con el contrato de AV-255 la duración excedida pide el motivo y dice proveedor y máximo (Figma 373-5370)', () => {
    const elementos = elementosAtencion(
      [
        alerta({ tipo: 'DuracionExcedida', servicio: 'Poda mayor del cierre', programacion_id: 4, dias: 1, id: 4, proveedor: 'Podas Altura Demo E.I.R.L.', maximo_dias: 10 }),
        alerta({ tipo: 'DuracionProxima', servicio: 'Corte de césped', programacion_id: 5, dias: 1, id: 5 }),
      ],
      servicios,
      [programacion({ id: 5, estado: 'EnCurso', proveedor: 'Fumigaciones Demo S.A.', codigo: 'FIT-2026-T5' })],
    )
    expect(elementos.map((e) => [e.titulo, e.detalle, e.accion, e.alertaId])).toEqual([
      ['Poda mayor del cierre · 1 día de exceso', 'Podas Altura Demo E.I.R.L. · máximo 10 días', 'registrarMotivo', 4],
      ['Corte de césped · mañana supera su máximo', 'FIT-2026-T5 · Fumigaciones Demo S.A. · máximo 3 días', 'verCiclo', 5],
      ['Control fitosanitario · sin duración configurada', 'Necesaria para programar', 'configurar', null],
    ])
  })
})

describe('listas del Resumen', () => {
  it('deja solo los ciclos programados o en curso de los próximos 14 días, en orden', () => {
    const ciclos = proximosCiclos(HOY, [
      programacion({ id: 1, fecha_inicio_prevista: '2026-11-10', fecha_fin_prevista: '2026-11-11' }),
      programacion({ id: 2, fecha_inicio_prevista: '2026-11-05', fecha_fin_prevista: '2026-11-06' }),
      programacion({ id: 3, fecha_inicio_prevista: '2026-11-25', fecha_fin_prevista: '2026-11-26' }),
      programacion({ id: 4, estado: 'Completada', fecha_inicio_prevista: '2026-11-05' }),
    ])
    expect(ciclos.map((c) => c.id)).toEqual([2, 1])
  })

  it('deja las restricciones vigentes o de los próximos 30 días', () => {
    const lista = restriccionesProximas(HOY, [
      restriccion({ id: 1, fecha_inicio: '2026-11-01', fecha_fin: '2026-11-03' }),
      restriccion({ id: 2, fecha_inicio: '2026-11-02', fecha_fin: '2026-11-05' }),
      restriccion({ id: 3, fecha_inicio: '2026-12-20', fecha_fin: '2026-12-20' }),
    ])
    expect(lista.map((r) => r.id)).toEqual([2])
  })
})

describe('restriccionesAgrupadas', () => {
  it('une las fechas de una serie en una fila, como en Figma', () => {
    const base = { tipo_restriccion_id: 1, aplica_servicios_ruidosos: true, hora_inicio: null, hora_fin: null, area_verde_id: null, descripcion: null }
    const filas = restriccionesAgrupadas('2026-11-04', [
      { ...base, id: 1, tipo: 'Jueves culturales', efecto: 'Advertencia', fecha_inicio: '2026-11-05', fecha_fin: '2026-11-05', serie: 'a' },
      { ...base, id: 2, tipo: 'Jueves culturales', efecto: 'Advertencia', fecha_inicio: '2026-11-12', fecha_fin: '2026-11-12', serie: 'a' },
      { ...base, id: 3, tipo: 'Reserva de jardín', efecto: 'Advertencia', fecha_inicio: '2026-11-07', fecha_fin: '2026-11-07', serie: null },
      { ...base, id: 4, tipo: 'Evaluaciones', efecto: 'Prohibicion', fecha_inicio: '2026-11-23', fecha_fin: '2026-11-28', serie: null },
    ])
    expect(filas.map((f) => [f.fechas, f.tipo])).toEqual([
      ['Jue 05 y 12', 'Jueves culturales'],
      ['Sáb 07', 'Reserva de jardín'],
      ['23 al 28', 'Evaluaciones'],
    ])
  })
})
