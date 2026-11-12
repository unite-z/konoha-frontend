import { describe, expect, it } from 'vitest'
import { insigniaAEstado } from './tonos'

describe('insigniaAEstado', () => {
  it('traduce los tonos de la Guía Web a los de Estado y conserva el resto', () => {
    expect(insigniaAEstado({ texto: 'Vencido', tono: 'advertencia', ayuda: 'Histórico' })).toEqual({
      texto: 'Vencido',
      tono: 'aviso',
      ayuda: 'Histórico',
    })
    expect(insigniaAEstado({ texto: 'Pendiente', tono: 'neutral' }).tono).toBe('neutro')
  })
})
