import { describe, expect, it } from 'vitest'
import type { AlertaPlanificacion } from '@/types/planificacion'
import { simularIdsAlertas, simularRegistrarMotivo } from './alertasPlanificacion'

const base: AlertaPlanificacion = { tipo: 'DuracionExcedida', servicio_id: 2, servicio: 'Poda', programacion_id: 40, dias: 1, mensaje: '' }

describe('alertas simuladas (AV-255)', () => {
  it('da a cada alerta un id estable y respeta el que ya trae', () => {
    expect(simularIdsAlertas([base, { ...base, tipo: 'FrecuenciaProxima', programacion_id: null }, { ...base, id: 7 }]).map((a) => a.id)).toEqual([40, 100_002, 7])
  })

  it('responde el motivo como alerta atendida', async () => {
    await expect(simularRegistrarMotivo(40, 'Lluvia')).resolves.toMatchObject({ id: 40, estado: 'Atendida', motivo: 'Lluvia' })
  })
})
