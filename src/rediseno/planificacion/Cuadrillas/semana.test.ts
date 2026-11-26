import { describe, expect, it } from 'vitest'
import {
  asignarCarriles,
  diaDeSemana,
  diferenciaDias,
  fechasDesplazadas,
  lunesDe,
  posicionEnSemana,
  semanaPedida,
} from './semana'

const semanal = {
  periodicidad: 'Semanal' as const,
  fecha_inicio: '2026-11-23',
  fecha_fin: '2026-11-29',
  plazo_previsto: '2026-11-28',
}

describe('semana', () => {
  it('calcula el lunes de cualquier día, también en cambio de año', () => {
    expect(diaDeSemana('2026-11-26')).toBe(3)
    expect(lunesDe('2026-11-26')).toBe('2026-11-23')
    expect(lunesDe('2026-11-29')).toBe('2026-11-23')
    expect(lunesDe('2027-01-01')).toBe('2026-12-28')
    expect(diferenciaDias('2026-11-23', '2026-12-01')).toBe(8)
  })

  it('usa la semana de la URL o, si no es válida, la de hoy', () => {
    expect(semanaPedida('2026-11-25', '2026-12-10')).toBe('2026-11-23')
    expect(semanaPedida('basura', '2026-12-10')).toBe('2026-12-07')
    expect(semanaPedida(null, '2026-12-10')).toBe('2026-12-07')
  })

  it('coloca el encargo periódico en su periodo y marca si se sale de la semana', () => {
    expect(posicionEnSemana(semanal, '2026-11-23')).toEqual({
      columna: 0,
      largo: 7,
      seSaleAntes: false,
      seSaleDespues: false,
    })
    expect(posicionEnSemana(semanal, '2026-11-30')).toBeNull()
    expect(posicionEnSemana({ ...semanal, fecha_inicio: '2026-11-20' }, '2026-11-23')).toMatchObject({
      columna: 0,
      seSaleAntes: true,
    })
    expect(posicionEnSemana({ ...semanal, fecha_fin: '2026-12-05' }, '2026-11-23')).toMatchObject({
      largo: 7,
      seSaleDespues: true,
    })
  })

  it('coloca el encargo directo en su plazo', () => {
    const directo = {
      ...semanal,
      periodicidad: 'Directo' as const,
      fecha_inicio: '2026-11-10',
      plazo_previsto: '2026-11-25',
    }
    expect(posicionEnSemana(directo, '2026-11-23')).toEqual({
      columna: 2,
      largo: 1,
      seSaleAntes: false,
      seSaleDespues: false,
    })
  })

  it('desplaza periodo y plazo los mismos días', () => {
    expect(fechasDesplazadas(semanal, 2)).toEqual({
      fecha_inicio: '2026-11-25',
      fecha_fin: '2026-12-01',
      plazo_previsto: '2026-11-30',
    })
  })

  it('en el directo solo mueve el plazo (y el fin), no el inicio', () => {
    const directo = {
      periodicidad: 'Directo' as const,
      fecha_inicio: '2026-11-20',
      fecha_fin: '2026-11-25',
      plazo_previsto: '2026-11-25',
    }
    expect(fechasDesplazadas(directo, -3)).toEqual({
      fecha_inicio: '2026-11-20',
      fecha_fin: '2026-11-22',
      plazo_previsto: '2026-11-22',
    })
  })

  it('reparte en carriles los encargos que se solapan', () => {
    expect(
      asignarCarriles([
        { columna: 0, largo: 3 },
        { columna: 1, largo: 1 },
        { columna: 3, largo: 2 },
      ]),
    ).toEqual({
      carriles: [0, 1, 0],
      total: 2,
    })
    expect(asignarCarriles([])).toEqual({ carriles: [], total: 1 })
  })
})
