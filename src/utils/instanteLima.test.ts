import { describe, expect, it } from 'vitest'
import {
  aInstanteLima,
  ahoraLimaLocal,
  esFuturo,
  esLocalValido,
  fechaLimaDeInstante,
  hoyLima,
  instanteALocalLima,
  milisegundos,
} from './instanteLima'

describe('ahoraLimaLocal y hoyLima', () => {
  it('usan la hora de Lima aunque el instante sea de otro día en UTC', () => {
    // 03:30 UTC del 22 = 22:30 del 21 en Lima.
    const instante = new Date('2026-10-22T03:30:00Z')
    expect(ahoraLimaLocal(instante)).toBe('2026-10-21T22:30')
    expect(hoyLima(instante)).toBe('2026-10-21')
  })

  it('rellena con ceros y usa 24 horas', () => {
    expect(ahoraLimaLocal(new Date('2026-01-05T05:07:00Z'))).toBe('2026-01-05T00:07')
  })
})

describe('esLocalValido', () => {
  it.each(['2026-10-21T08:00', '2028-02-29T23:59', '2026-10-21T08:00:30'])('acepta %s', (valor) => {
    expect(esLocalValido(valor)).toBe(true)
  })

  it.each(['', '2026-10-21', '2026-13-01T08:00', '2026-02-29T08:00', '2026-04-31T10:00', '2026-10-21T24:00',
    '2026-10-21T08:60', '21/10/2026 08:00', '2026-10-21T08:00-05:00'])('rechaza %s', (valor) => {
    expect(esLocalValido(valor)).toBe(false)
  })
})

describe('aInstanteLima', () => {
  it('agrega segundos y el desfase fijo de Lima', () => {
    expect(aInstanteLima('2026-10-21T08:00')).toBe('2026-10-21T08:00:00-05:00')
  })

  it('ignora los segundos del campo', () => {
    expect(aInstanteLima('2026-10-21T08:00:45')).toBe('2026-10-21T08:00:00-05:00')
  })

  it('representa el mismo instante en UTC', () => {
    expect(new Date(aInstanteLima('2026-10-21T22:30')).toISOString()).toBe('2026-10-22T03:30:00.000Z')
  })

  it('lanza error con un valor no válido', () => {
    expect(() => aInstanteLima('2026-02-30T08:00')).toThrow(RangeError)
  })
})

describe('conversión desde instantes del back-end', () => {
  it('fechaLimaDeInstante usa la fecha de Lima', () => {
    expect(fechaLimaDeInstante('2026-10-22T02:00:00Z')).toBe('2026-10-21')
    expect(fechaLimaDeInstante('2026-10-21T12:00:00-05:00')).toBe('2026-10-21')
    expect(fechaLimaDeInstante('no es fecha')).toBeNull()
  })

  it('instanteALocalLima es inversa de aInstanteLima', () => {
    expect(instanteALocalLima(aInstanteLima('2026-10-21T07:15'))).toBe('2026-10-21T07:15')
    expect(instanteALocalLima('2026-10-21T15:10:00+02:00')).toBe('2026-10-21T08:10')
    expect(instanteALocalLima('')).toBeNull()
  })
})

describe('comparaciones', () => {
  it('milisegundos acepta valores locales de Lima e instantes', () => {
    expect(milisegundos('2026-10-21T08:00')).toBe(Date.parse('2026-10-21T13:00:00Z'))
    expect(milisegundos('2026-10-21T13:00:00Z')).toBe(Date.parse('2026-10-21T13:00:00Z'))
    expect(milisegundos('basura')).toBeNaN()
  })

  it('esFuturo compara en hora de Lima', () => {
    const ahora = new Date('2026-10-21T13:00:00Z') // 08:00 en Lima
    expect(esFuturo('2026-10-21T08:01', ahora)).toBe(true)
    expect(esFuturo('2026-10-21T08:00', ahora)).toBe(false)
    expect(esFuturo('2026-10-21T07:59', ahora)).toBe(false)
  })
})
