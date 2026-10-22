import { describe, expect, it } from 'vitest'
import { validarDuracion, validarFrecuencia, validarRestriccion } from './validacionPlanificacion'

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

describe('validarRestriccion', () => {
  const base = { tipo: '2', fechaInicio: '2026-10-20', fechaFin: '2026-10-22', horaInicio: '', horaFin: '', descripcion: '' }

  it('acepta lo mínimo', () => {
    expect(validarRestriccion(base).entrada).toEqual({ tipo_restriccion_id: 2, fecha_inicio: '2026-10-20', fecha_fin: '2026-10-22' })
  })

  it('incluye horas y descripción recortada', () => {
    const { entrada } = validarRestriccion({ ...base, horaInicio: '08:00', horaFin: '10:00', descripcion: ' Examen ' })
    expect(entrada).toMatchObject({ hora_inicio: '08:00', hora_fin: '10:00', descripcion: 'Examen' })
  })

  it('exige tipo y fechas', () => {
    const { errores } = validarRestriccion({ ...base, tipo: '', fechaInicio: '', fechaFin: '' })
    expect(Object.keys(errores).sort()).toEqual(['fechaFin', 'fechaInicio', 'tipo'])
  })

  it('rechaza fin anterior al inicio y horas incoherentes en un solo día', () => {
    expect(validarRestriccion({ ...base, fechaFin: '2026-10-19' }).errores.fechaFin).toBeDefined()
    const mismoDia = { ...base, fechaFin: '2026-10-20', horaInicio: '10:00', horaFin: '09:00' }
    expect(validarRestriccion(mismoDia).errores.horaFin).toBeDefined()
    expect(validarRestriccion({ ...mismoDia, fechaFin: '2026-10-21' }).entrada).not.toBeNull()
  })
})
