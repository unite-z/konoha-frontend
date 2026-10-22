import { describe, expect, it } from 'vitest'
import type { FrecuenciaEstacion } from '../types/planificacion'
import { filasPorEstacion, horaCorta, textoDias, textoHorario } from './planificacion'

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

describe('filasPorEstacion', () => {
  it('da las cuatro estaciones en orden aunque falten frecuencias', () => {
    const filas = filasPorEstacion([frecuencia('Primavera'), frecuencia('Verano')])
    expect(filas.map((f) => f.estacion)).toEqual(['Verano', 'Otoño', 'Invierno', 'Primavera'])
    expect(filas.map((f) => f.frecuencia !== null)).toEqual([true, false, false, true])
  })
})

describe('horaCorta', () => {
  it('quita los segundos', () => {
    expect(horaCorta('06:00:00')).toBe('06:00')
    expect(horaCorta(null)).toBeNull()
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

describe('textoHorario', () => {
  it('cubre los casos', () => {
    expect(textoHorario('08:00', '12:00')).toBe('08:00 a 12:00')
    expect(textoHorario('08:00:00', null)).toBe('Desde 08:00')
    expect(textoHorario(null, '12:00')).toBe('Hasta 12:00')
    expect(textoHorario(null, null)).toBe('—')
  })
})
