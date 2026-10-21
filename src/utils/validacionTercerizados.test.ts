import { describe, expect, it } from 'vitest'
import { validarEjecucion, validarOrdenCompra } from './validacionTercerizados'

describe('validarOrdenCompra', () => {
  it('exige el número', () => {
    expect(validarOrdenCompra({ numero: '  ', motivo: '' }, false).numero).toMatch(/número/)
  })

  it('acepta una OC nueva sin motivo', () => {
    expect(validarOrdenCompra({ numero: ' OC-2026-001 ', motivo: '' }, false)).toEqual({})
  })

  it('limita el largo a 30 caracteres', () => {
    expect(validarOrdenCompra({ numero: 'x'.repeat(30), motivo: '' }, false)).toEqual({})
    expect(validarOrdenCompra({ numero: 'x'.repeat(31), motivo: '' }, false).numero).toMatch(/30/)
  })

  it('la corrección exige motivo y un número distinto', () => {
    expect(validarOrdenCompra({ numero: 'OC-2', motivo: ' ' }, true, 'OC-1').motivo).toMatch(/por qué/)
    expect(validarOrdenCompra({ numero: 'OC-1', motivo: 'Error' }, true, 'OC-1').numero).toMatch(/igual/)
    expect(validarOrdenCompra({ numero: 'OC-2', motivo: 'Logística reemitió la orden' }, true, 'OC-1')).toEqual({})
  })
})

describe('validarEjecucion', () => {
  const ahora = new Date('2026-10-21T15:00:00Z') // 10:00 en Lima

  it('exige una fecha válida', () => {
    expect(validarEjecucion('inicio', '', null, ahora).error).toMatch(/inicio/)
    expect(validarEjecucion('fin', '', null, ahora).error).toMatch(/fin/)
    expect(validarEjecucion('inicio', '2026-02-30T08:00', null, ahora).error).toMatch(/válidas/)
  })

  it('acepta una hora pasada sin advertencias', () => {
    expect(validarEjecucion('inicio', '2026-10-21T08:00', null, ahora)).toEqual({})
  })

  it('advierte (sin bloquear) si la hora es futura en Lima', () => {
    const resultado = validarEjecucion('inicio', '2026-10-21T10:30', null, ahora)
    expect(resultado.error).toBeUndefined()
    expect(resultado.advertencia).toMatch(/posteriores/)
  })

  it('el fin no puede ser anterior al inicio', () => {
    const inicio = '2026-10-21T08:00:00-05:00'
    expect(validarEjecucion('fin', '2026-10-21T07:59', inicio, ahora).error).toMatch(/anterior/)
    expect(validarEjecucion('fin', '2026-10-21T08:00', inicio, ahora)).toEqual({})
    expect(validarEjecucion('fin', '2026-10-21T09:30', inicio, ahora)).toEqual({})
  })

  it('compara el inicio al minuto aunque tenga segundos o venga en UTC', () => {
    expect(validarEjecucion('fin', '2026-10-21T08:00', '2026-10-21T13:00:45Z', ahora)).toEqual({})
    expect(validarEjecucion('fin', '2026-10-21T07:59', '2026-10-21T13:00:45Z', ahora).error).toBeDefined()
  })
})
