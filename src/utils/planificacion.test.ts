import { describe, expect, it } from 'vitest'
import type { FrecuenciaEstacion } from '../types/planificacion'
import { ordenarPorEstacion, textoDias, textoHorario } from './planificacion'

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

describe('textoHorario', () => {
  it('cubre los casos', () => {
    expect(textoHorario('08:00', '12:00')).toBe('08:00 a 12:00')
    expect(textoHorario('08:00', null)).toBe('Desde 08:00')
    expect(textoHorario(null, '12:00')).toBe('Hasta 12:00')
    expect(textoHorario(null, null)).toBe('—')
  })
})
