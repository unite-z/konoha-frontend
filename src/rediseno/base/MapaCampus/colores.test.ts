import { describe, expect, it } from 'vitest'
import type { DatosCampus } from '@/types/campus3d'
import { agruparPorClase } from './colores'

const datos = {
  areas: [
    { id: 'a', p: [] },
    { id: 'b', p: [] },
    { id: 'a', p: [] },
    { id: 'c', p: [] },
  ],
} as unknown as DatosCampus

describe('agruparPorClase (AV-426)', () => {
  it('colorea por clase, con todas las partes de un id, y usa el token de la clase', () => {
    const grupos = agruparPorClase(
      datos,
      { a: 'cortada', b: 'pendiente' },
      { cortada: '--color-success', pendiente: '--color-warning' },
    )
    expect(grupos).toEqual([
      { token: '--color-success', indices: [0, 2] },
      { token: '--color-warning', indices: [1] },
    ])
  })

  it('ignora los ids ausentes del campus, las clases sin color y las áreas sin clase', () => {
    const grupos = agruparPorClase(datos, { zzz: 'cortada', c: 'rara' }, { cortada: '--color-success' })
    expect(grupos).toEqual([])
  })

  it('dos clases con el mismo token comparten capa', () => {
    const grupos = agruparPorClase(datos, { a: 'x', b: 'y' }, { x: '--color-info', y: '--color-info' })
    expect(grupos).toEqual([{ token: '--color-info', indices: [0, 1, 2] }])
  })
})
