import { describe, expect, it } from 'vitest'
import { validarDuracion, validarFrecuencia } from './validacionPlanificacion'

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

describe('validarDuracion', () => {
  const vacio = { duracion: '3', limpieza: '', inicio: '', fin: '' }

  it('acepta solo la duración máxima', () => {
    expect(validarDuracion(vacio).entrada).toEqual({ duracion_maxima_dias: 3 })
  })

  it('incluye limpieza y horario', () => {
    const { entrada } = validarDuracion({ duracion: '3', limpieza: '1', inicio: '06:00', fin: '12:30' })
    expect(entrada).toEqual({ duracion_maxima_dias: 3, dias_limpieza: 1, hora_inicio: '06:00', hora_fin: '12:30' })
  })

  it.each(['', '0', '1,5', 'x'])('rechaza la duración %j', (duracion) => {
    expect(validarDuracion({ ...vacio, duracion }).errores.duracion).toBeDefined()
  })

  it('rechaza horas mal formadas y fin no posterior al inicio', () => {
    expect(validarDuracion({ ...vacio, inicio: '25:00' }).errores.inicio).toBeDefined()
    expect(validarDuracion({ ...vacio, inicio: '10:00', fin: '10:00' }).errores.fin).toBeDefined()
  })
})
