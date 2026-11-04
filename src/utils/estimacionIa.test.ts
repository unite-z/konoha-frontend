import { describe, expect, it } from 'vitest'
import type { EstimacionRecursos } from '../types/estimacionIa'
import {
  aInsumosEnEdicion,
  calcularDiferencia,
  deRecursosEnEdicion,
  confirmadoDesdeDecisiones,
  leerNumero,
  resumenEstimacion,
  textoDiferencia,
  textoDuracion,
  textoOperarios,
  validarConfirmados,
} from './estimacionIa'

const ESTIMACION: EstimacionRecursos = {
  operarios_min: 2,
  operarios_max: 4,
  operarios_sugeridos: 3,
  duracion: 6,
  unidad_duracion: 'horas',
  insumos: [
    { nombre: 'Fertilizante NPK 20-20-20', cantidad: 5, unidad: 'kg' },
    { nombre: 'Bolsas de residuos', cantidad: 30, unidad: 'u' },
  ],
}

describe('textos con unidades', () => {
  it('operarios y duración', () => {
    expect(textoOperarios(ESTIMACION)).toBe('Entre 2 y 4 · sugeridos 3 operarios')
    expect(textoOperarios({ operarios_min: 1, operarios_max: 1, operarios_sugeridos: 1 })).toBe('1 operario')
    expect(textoDuracion(6, 'horas')).toBe('6 horas')
    expect(textoDuracion(1, 'jornadas')).toBe('1 jornada')
  })

  it('diferencias con signo y unidad', () => {
    expect(textoDiferencia(1, 'operario')).toBe('+1 operario')
    expect(textoDiferencia(-2, 'h')).toBe('−2 h')
    expect(textoDiferencia(0, 'h')).toBe('Sin diferencia')
    expect(textoDiferencia(null, 'h')).toBe('—')
  })
})

describe('calcularDiferencia', () => {
  it('compara operarios, duración e insumos por nombre y unidad', () => {
    const diferencia = calcularDiferencia(ESTIMACION, {
      operarios: 4,
      duracion: 5,
      unidad_duracion: 'horas',
      insumos: [
        { nombre: 'fertilizante npk 20-20-20', cantidad: 4, unidad: 'kg' },
        { nombre: 'Guantes', cantidad: 6, unidad: 'u' },
      ],
    })
    expect(diferencia).toEqual({
      operarios: 1,
      duracion: -1,
      insumos: [
        { nombre: 'fertilizante npk 20-20-20', unidad: 'kg', diferencia: -1 },
        { nombre: 'Bolsas de residuos', unidad: 'u', diferencia: -30 },
        { nombre: 'Guantes', unidad: 'u', diferencia: 6 },
      ],
    })
  })

  it('convierte jornadas a la unidad de la estimación y sin estimación no hay diferencia de operarios', () => {
    expect(calcularDiferencia(ESTIMACION, { operarios: null, duracion: 1, unidad_duracion: 'jornadas', insumos: ESTIMACION.insumos })).toEqual({
      operarios: null,
      duracion: 2,
      insumos: [],
    })
    expect(calcularDiferencia(null, { operarios: 2, duracion: 3, unidad_duracion: 'horas', insumos: [] })).toEqual({
      operarios: null,
      duracion: null,
      insumos: [],
    })
  })
})

describe('validarConfirmados', () => {
  it('operarios enteros ≥ 1, duración > 0 e insumos completos', () => {
    expect(validarConfirmados({ operarios: 3, duracion: 6, unidad_duracion: 'horas', insumos: ESTIMACION.insumos })).toEqual({})
    const errores = validarConfirmados({
      operarios: 1.5,
      duracion: 0,
      unidad_duracion: 'horas',
      insumos: [{ nombre: '', cantidad: -1, unidad: '' }],
    })
    expect(Object.keys(errores)).toEqual(['operarios', 'duracion', 'insumos'])
    expect(Object.keys(errores.insumos?.[0] ?? {})).toEqual(['nombre', 'cantidad', 'unidad'])
  })
})

describe('decisiones y resumen', () => {
  it('confirmadoDesdeDecisiones: aceptar, corregir y descartar', () => {
    const corregido = { operarios: 2, duracion: 1, unidad_duracion: 'jornadas' as const, insumos: [] }
    expect(confirmadoDesdeDecisiones(ESTIMACION, { operarios: 'aceptar', duracion: 'corregir', insumos: 'descartar', corregido })).toEqual({
      operarios: 3,
      duracion: 1,
      unidad_duracion: 'jornadas',
      insumos: [],
    })
  })

  it('resumen con lo confirmado o lo estimado', () => {
    expect(resumenEstimacion({ estimacion: ESTIMACION, decision: null })).toBe('3 operarios · 6 h · 2 insumos')
    expect(resumenEstimacion({ estimacion: null, decision: null })).toBe('Sin recomendación')
  })

  it('leerNumero acepta coma decimal', () => {
    expect(leerNumero('2,5')).toBe(2.5)
    expect(leerNumero('')).toBeNull()
    expect(leerNumero('abc')).toBeNull()
  })
})

describe('edición', () => {
  it('convierte lo escrito en valores (vacío = null, texto no numérico = NaN)', () => {
    expect(aInsumosEnEdicion([{ nombre: 'Aceite', cantidad: 0.5, unidad: 'L' }])).toEqual([{ nombre: 'Aceite', cantidad: '0,5', unidad: 'L' }])
    const r = deRecursosEnEdicion({ operarios: '3', duracion: '', unidad_duracion: 'horas', insumos: [{ nombre: ' Aceite ', cantidad: '0,5', unidad: 'L' }] })
    expect(r).toEqual({ operarios: 3, duracion: null, unidad_duracion: null, insumos: [{ nombre: 'Aceite', cantidad: 0.5, unidad: 'L' }] })
    expect(Number.isNaN(deRecursosEnEdicion({ operarios: 'dos', duracion: '1', unidad_duracion: 'jornadas', insumos: [] }).operarios)).toBe(true)
  })
})
