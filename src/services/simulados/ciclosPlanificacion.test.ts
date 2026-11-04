import { describe, expect, it } from 'vitest'
import type { Programacion } from '@/types/planificacion'
import { prefijoServicio, simularCodigosCiclos } from './ciclosPlanificacion'

const ciclo: Programacion = {
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
}

describe('códigos de ciclo simulados (AV-364)', () => {
  it('toma las iniciales del servicio sin palabras vacías', () => {
    expect(['Corte de césped', 'Poda mayor del cierre', 'Mantenimiento de jardines', 'Mantenimiento · Cuad. A'].map(prefijoServicio)).toEqual(['CC', 'PM', 'MJ', 'MC'])
  })

  it('compone el código con el año y el mes del inicio y respeta el que ya trae', () => {
    expect(simularCodigosCiclos([ciclo, { ...ciclo, codigo: 'CC-2026-07' }]).map((c) => c.codigo)).toEqual(['CC-2026-11', 'CC-2026-07'])
  })
})
