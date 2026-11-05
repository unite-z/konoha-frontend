import { describe, expect, it } from 'vitest'
import type { ContratoMaestro } from '../types/maestrosTercerizados'
import type { AlcanceSeleccionado } from './nuevaAtencion'
import { BORRADOR_PLAN_VACIO, construirPlan, estacionesProgramadas, validarPlan, type BorradorPlanFitosanitario } from './planFitosanitario'

const CONTRATO: ContratoMaestro = {
  id: 1,
  numero: 'CT-2026-001',
  proveedor_id: 1,
  proveedor_nombre: 'Fumigaciones del Campus S.A.',
  tipo_servicio_id: 1,
  tipo_servicio_nombre: 'Control fitosanitario',
  vigencia_inicio: '2026-01-01',
  vigencia_fin: '2026-12-31',
  area_metrado_estimado: null,
  monto_fijo: null,
  frecuencia_pactada: null,
  frecuencia_cantidad: null,
  frecuencia_unidad: null,
  condiciones: '',
  vigente: true,
  atenciones: 0,
}

const AREA: AlcanceSeleccionado = { clave: 'area:1', tipo: 'area', id: 1, etiqueta: 'Jardín Central', metrado: '', unidad_medida_id: '' }

const PLAN_COMPLETO: BorradorPlanFitosanitario = {
  contrato: CONTRATO,
  fechas: { Verano: '2026-01-15', Otoño: '2026-04-15', Invierno: '2026-07-15', Primavera: '2026-10-15' },
  alcances: [AREA],
  motivo: '',
}

describe('validarPlan', () => {
  it('pide el contrato', () => {
    expect(validarPlan(BORRADOR_PLAN_VACIO, '2026-05-01').contrato).toBeDefined()
  })

  it('rechaza un contrato vencido', () => {
    const vencido = { ...CONTRATO, vigencia_fin: '2025-12-31' }
    expect(validarPlan({ ...PLAN_COMPLETO, contrato: vencido }, '2026-05-01').contrato).toBeDefined()
  })

  it('acepta un plan con las cuatro estaciones sin motivo', () => {
    const errores = validarPlan(PLAN_COMPLETO, '2026-05-01')
    expect(errores.contrato).toBeUndefined()
    expect(errores.motivo).toBeUndefined()
  })

  it('exige motivo si falta alguna estación', () => {
    const incompleto = { ...PLAN_COMPLETO, fechas: { ...PLAN_COMPLETO.fechas, Invierno: '', Primavera: '' } }
    expect(validarPlan(incompleto, '2026-05-01').motivo).toBeDefined()
    expect(validarPlan({ ...incompleto, motivo: 'Mantenimiento interno este año' }, '2026-05-01').motivo).toBeUndefined()
  })

  it('exige al menos una estación programada', () => {
    expect(validarPlan({ ...PLAN_COMPLETO, fechas: { Verano: '', Otoño: '', Invierno: '', Primavera: '' } }, '2026-05-01').motivo).toBeDefined()
  })
})

describe('estacionesProgramadas', () => {
  it('cuenta solo las estaciones con fecha', () => {
    expect(estacionesProgramadas(PLAN_COMPLETO)).toEqual(['Verano', 'Otoño', 'Invierno', 'Primavera'])
    expect(estacionesProgramadas({ ...PLAN_COMPLETO, fechas: { ...PLAN_COMPLETO.fechas, Invierno: '' } })).toEqual([
      'Verano',
      'Otoño',
      'Primavera',
    ])
  })
})

describe('construirPlan', () => {
  it('arma una aplicación por estación programada, con los mismos alcances', () => {
    const entrada = construirPlan(PLAN_COMPLETO)
    expect(entrada.contrato_id).toBe(1)
    expect(entrada.aplicaciones).toHaveLength(4)
    expect(entrada.aplicaciones[0]).toEqual({
      estacion: 'Verano',
      fecha_inicio: '2026-01-15',
      fecha_fin: '2026-01-15',
      alcances: [{ area_verde_id: 1 }],
    })
    expect(entrada.motivo).toBeUndefined()
  })

  it('incluye el motivo cuando se indica', () => {
    const entrada = construirPlan({ ...PLAN_COMPLETO, motivo: ' Mantenimiento interno ' })
    expect(entrada.motivo).toBe('Mantenimiento interno')
  })
})
