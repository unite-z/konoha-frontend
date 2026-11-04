import { describe, expect, it } from 'vitest'
import type { ServicioPeriodico } from '@/types/planificacion'
import { simularViaServicios, valoresInicialesDe } from './serviciosPlanificacion'

const fito: ServicioPeriodico = { id: 2, nombre: 'Control fitosanitario', es_ruidoso: false, frecuencias: [], duracion: null }

describe('servicios periódicos simulados (AV-363)', () => {
  it('añade la vía y el proveedor sin pisar los que ya trae', () => {
    expect(simularViaServicios([fito, { ...fito, via: 'PersonalPropio', proveedor: null }]).map((s) => [s.via, s.proveedor])).toEqual([
      ['Tercerizado', 'Fumigaciones Demo S.A.'],
      ['PersonalPropio', null],
    ])
  })

  it('da los valores iniciales de la sección para cada servicio', () => {
    const valores = valoresInicialesDe(fito)
    expect(valores.frecuencias).toHaveLength(4)
    expect(valores.frecuencias[0]).toMatchObject({ frecuencia_teorica_dias: 90, frecuencia_maxima_dias: 100 })
    expect(valores.duracion).toMatchObject({ duracion_maxima_dias: 1, hora_inicio: '06:00', hora_fin: '18:00' })
  })
})
