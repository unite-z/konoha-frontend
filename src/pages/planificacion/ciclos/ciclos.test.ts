import { describe, expect, it } from 'vitest'
import type { Programacion } from '@/types/planificacion'
import { avanceCiclo, ciclosDePestana, contadoresCiclos, fechasCiclo, ordenarCiclos, rangoCiclos } from './ciclos'

function ciclo(parcial: Partial<Programacion>): Programacion {
  return {
    id: 1,
    tipo_servicio_id: 1,
    servicio: 'Corte de césped',
    proveedor_id: null,
    proveedor: null,
    estacion: 'Primavera',
    fecha_inicio_prevista: '2026-11-16',
    fecha_fin_prevista: '2026-11-19',
    estado: 'Programada',
    fecha_inicio_real: null,
    fecha_fin_real: null,
    ...parcial,
  }
}

const ciclos = [
  ciclo({ id: 1, estado: 'Completada', fecha_inicio_prevista: '2026-10-21', fecha_fin_prevista: '2026-10-31' }),
  ciclo({ id: 2, estado: 'Programada', fecha_inicio_prevista: '2026-12-14', fecha_fin_prevista: '2026-12-17' }),
  ciclo({ id: 3, estado: 'EnCurso', fecha_inicio_real: '2026-11-16' }),
  ciclo({ id: 4, estado: 'Programada', fecha_inicio_prevista: '2026-11-30', fecha_fin_prevista: '2026-11-30' }),
  ciclo({ id: 5, estado: 'Completada', fecha_inicio_prevista: '2026-11-02', fecha_fin_prevista: '2026-11-04' }),
  ciclo({ id: 6, estado: 'Cancelada' }),
]

describe('lista de ciclos', () => {
  it('consulta seis meses atrás y adelante', () => {
    expect(rangoCiclos('2026-11-04')).toEqual({ desde: '2026-05-08', hasta: '2027-05-03' })
  })

  it('cuenta y filtra por pestaña; «Todos» incluye las canceladas', () => {
    expect(contadoresCiclos(ciclos)).toEqual({ todos: 6, programados: 2, enCurso: 1, completados: 2 })
    expect(ciclosDePestana(ciclos, 'enCurso').map((c) => c.id)).toEqual([3])
  })

  it('ordena en curso, programadas por fecha y completadas de la más reciente', () => {
    expect(ordenarCiclos(ciclos).map((c) => c.id)).toEqual([3, 4, 2, 5, 1, 6])
  })

  it('calcula el avance por días y no llega a 100 hasta finalizar', () => {
    const enCurso = ciclo({ estado: 'EnCurso', fecha_inicio_real: '2026-11-16' })
    expect(avanceCiclo(enCurso, '2026-11-17')).toBe(50)
    expect(avanceCiclo(enCurso, '2026-11-25')).toBe(99)
    expect(avanceCiclo(ciclo({ estado: 'Completada' }), '2026-11-17')).toBe(100)
    expect(avanceCiclo(ciclo({}), '2026-11-17')).toBeNull()
  })
})

describe('fechasCiclo', () => {
  it('escribe las fechas como en Figma, sin raya', () => {
    expect([fechasCiclo('2026-11-16', '2026-11-19'), fechasCiclo('2026-11-30', '2026-11-30')]).toEqual(['16/11 al 19/11', '30/11'])
  })
})
