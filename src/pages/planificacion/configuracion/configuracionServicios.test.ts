import { describe, expect, it } from 'vitest'
import type { ServicioPeriodico } from '@/types/planificacion'
import { borradorInicial, detalleServicio, estacionDe, estadoServicio, textoDuracionServicio, textoFrecuencia, validarServicio } from './configuracionServicios'

const modificacion = { fecha_modificacion: '2026-10-28T09:12:00-05:00', modificado_por: 'Robert G.' }
const servicio: ServicioPeriodico = {
  id: 1,
  nombre: 'Corte de césped',
  es_ruidoso: true,
  frecuencias: [{ estacion: 'Primavera', frecuencia_teorica_dias: 21, frecuencia_practica_dias: 30, frecuencia_maxima_dias: 45, ...modificacion }],
  duracion: { duracion_maxima_dias: 3, dias_limpieza: 1, hora_inicio: null, hora_fin: null, ...modificacion },
}

describe('configuracionServicios', () => {
  it('calcula la estación con los cortes del backend', () => {
    expect(estacionDe('2026-03-20')).toBe('Verano')
    expect(estacionDe('2026-03-21')).toBe('Otoño')
    expect(estacionDe('2026-06-21')).toBe('Invierno')
    expect(estacionDe('2026-09-23')).toBe('Primavera')
    expect(estacionDe('2026-12-21')).toBe('Verano')
  })

  it('resume frecuencia, duración y estado', () => {
    expect(textoFrecuencia(servicio.frecuencias[0])).toBe('Cada 30 días · máx. 45')
    expect(textoFrecuencia(undefined)).toBe('Sin configurar')
    expect(textoFrecuencia({ ...servicio.frecuencias[0], frecuencia_teorica_dias: 365, frecuencia_practica_dias: 365, frecuencia_maxima_dias: 365 })).toBe('Anual')
    expect([
      detalleServicio({ ...servicio, via: 'Tercerizado', es_ruidoso: true }),
      detalleServicio({ ...servicio, via: 'PersonalPropio', es_ruidoso: false }),
      detalleServicio({ ...servicio, via: undefined, es_ruidoso: true }),
      detalleServicio({ ...servicio, via: null, es_ruidoso: false }),
    ]).toEqual(['Tercerizado · ruidoso', 'Personal propio', 'Ruidoso', null])
    expect(textoDuracionServicio(servicio.duracion)).toBe('3 días + 1 de limpieza')
    expect(estadoServicio(servicio).texto).toBe('Incompleto')
  })

  it('valida solo lo que cambia y deja vacías las estaciones sin configurar', () => {
    const inicial = borradorInicial(servicio)
    expect(validarServicio(inicial, inicial)).toMatchObject({ valido: true, frecuencias: [], duracion: null })

    const conCambios = {
      ...inicial,
      frecuencias: { ...inicial.frecuencias, Verano: { teorica: '21', practica: '30', maxima: '25' }, Otoño: { teorica: '20', practica: '', maxima: '' } },
      duracion: { ...inicial.duracion, duracion: '4' },
    }
    const resultado = validarServicio(conCambios, inicial)
    expect(resultado.valido).toBe(false)
    expect(resultado.erroresFrecuencia.Verano?.maxima).toBe('Verano: la máxima no puede ser menor que la práctica')
    expect(resultado.frecuencias).toEqual([{ estacion: 'Otoño', entrada: { frecuencia_teorica_dias: 20 } }])
    expect(resultado.duracion).toMatchObject({ duracion_maxima_dias: 4, dias_limpieza: 1 })
  })

  it('no deja vaciar una frecuencia ya configurada', () => {
    const inicial = borradorInicial(servicio)
    const vaciada = { ...inicial, frecuencias: { ...inicial.frecuencias, Primavera: { teorica: '', practica: '', maxima: '' } } }
    expect(validarServicio(vaciada, inicial).erroresFrecuencia.Primavera?.teorica).toBeTruthy()
  })
})
