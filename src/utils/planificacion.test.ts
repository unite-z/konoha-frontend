import { describe, expect, it } from 'vitest'
import type { FrecuenciaEstacion } from '../types/planificacion'
import { ordenarPorEstacion, textoDias } from './planificacion'

function frecuencia(estacion: FrecuenciaEstacion['estacion']): FrecuenciaEstacion {
  return {
    estacion,
    frecuencia_teorica_dias: 7,
    frecuencia_practica_dias: null,
    frecuencia_maxima_dias: null,
    fecha_modificacion: '2026-10-01T10:00:00-05:00',
    modificado_por: 'Jefe',
  }
}

describe('ordenarPorEstacion', () => {
  it('ordena según el año sin mutar la entrada', () => {
    const entrada = [frecuencia('Primavera'), frecuencia('Verano'), frecuencia('Invierno'), frecuencia('Otoño')]
    expect(ordenarPorEstacion(entrada).map((f) => f.estacion)).toEqual(['Verano', 'Otoño', 'Invierno', 'Primavera'])
    expect(entrada[0].estacion).toBe('Primavera')
  })
})

describe('textoDias', () => {
  it('usa singular y plural', () => {
    expect(textoDias(1)).toBe('1 día')
    expect(textoDias(15)).toBe('15 días')
  })
  it('muestra raya larga sin valor', () => {
    expect(textoDias(null)).toBe('—')
  })
})
