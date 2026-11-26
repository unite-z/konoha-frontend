import { describe, expect, it } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import { cuerpoDesdeDecisiones, type ValorExtraccion } from './adaptadorExtraccion'
import { sugerenciaDePrueba } from './sugerenciaDePrueba'

const valor = (texto: string): ValorExtraccion => ({ valor: null, texto })

describe('cuerpoDesdeDecisiones', () => {
  const s = sugerenciaDePrueba({ 1: 120.5, 2: null })

  it('traduce aceptar, corregir y descartar', () => {
    const cuerpo = cuerpoDesdeDecisiones(s, {
      campo_1: { accion: 'corregir', valorFinal: valor('130,5') },
      campo_2: { accion: 'descartar', valorFinal: null },
    })
    expect(cuerpo.decisiones).toEqual({
      campo_1: { accion: 'corregir', valor_final: 130.5 },
      campo_2: { accion: 'descartar' },
    })
  })

  it('descarta al aceptar un dato opcional sin valor, y exige corregir uno obligatorio', () => {
    const cuerpo = cuerpoDesdeDecisiones(s, {
      campo_1: { accion: 'aceptar', valorFinal: valor('120,5') },
      campo_2: { accion: 'aceptar', valorFinal: valor('') },
    })
    expect(cuerpo.decisiones.campo_2).toEqual({ accion: 'descartar' })

    const sinMetrado = sugerenciaDePrueba({ 2: 'ok' })
    expect(() =>
      cuerpoDesdeDecisiones(sinMetrado, {
        campo_1: { accion: 'aceptar', valorFinal: valor('') },
        campo_2: { accion: 'aceptar', valorFinal: valor('ok') },
      }),
    ).toThrow(/Metrado: es obligatorio/)
  })

  it('rechaza con 422 si falta decidir un dato o la corrección no es válida', () => {
    expect(() => cuerpoDesdeDecisiones(s, { campo_1: { accion: 'aceptar', valorFinal: valor('1') } })).toThrow(ErrorApi)
    expect(() => cuerpoDesdeDecisiones(s, { campo_1: { accion: 'aceptar', valorFinal: valor('1') } })).toThrow(
      /Observaciones/,
    )
    expect(() =>
      cuerpoDesdeDecisiones(s, {
        campo_1: { accion: 'corregir', valorFinal: valor('abc') },
        campo_2: { accion: 'descartar', valorFinal: null },
      }),
    ).toThrow(/Metrado/)
  })
})
