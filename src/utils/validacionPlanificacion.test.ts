import { describe, expect, it } from 'vitest'
import { validarFrecuencia } from './validacionPlanificacion'

describe('validarFrecuencia', () => {
  it('acepta solo la teórica', () => {
    expect(validarFrecuencia({ teorica: '7', practica: '', maxima: '' }).entrada).toEqual({ frecuencia_teorica_dias: 7 })
  })

  it('incluye práctica y máxima cuando existen', () => {
    const { entrada } = validarFrecuencia({ teorica: '7', practica: '10', maxima: '14' })
    expect(entrada).toEqual({ frecuencia_teorica_dias: 7, frecuencia_practica_dias: 10, frecuencia_maxima_dias: 14 })
  })

  it.each(['', '0', '-3', '2,5', 'abc'])('rechaza la teórica %j', (teorica) => {
    expect(validarFrecuencia({ teorica, practica: '', maxima: '' }).errores.teorica).toBeDefined()
  })

  it('exige máxima >= habitual, que es la práctica si existe', () => {
    expect(validarFrecuencia({ teorica: '7', practica: '', maxima: '6' }).errores.maxima).toContain('7 días')
    expect(validarFrecuencia({ teorica: '7', practica: '10', maxima: '9' }).errores.maxima).toContain('10 días')
    expect(validarFrecuencia({ teorica: '7', practica: '10', maxima: '10' }).entrada).not.toBeNull()
  })
})
