import { describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '@/services/api/cliente'
import { propuestaCompleta, registrarEnBloque } from './registroEnBloque'
import { sugerenciaDePrueba } from './sugerenciaDePrueba'

const completa = (id: number) => sugerenciaDePrueba({ 1: 10, 2: 'ok' }, { id })
const sinValor = (id: number) => sugerenciaDePrueba({ 1: 10 }, { id })
const conFaltantes = (id: number) => sugerenciaDePrueba({ 1: 10, 2: 'ok' }, { id }, ['Metrado'])

describe('propuestaCompleta', () => {
  it('exige pendiente, sin obligatorios faltantes y valor en todos los datos', () => {
    expect(propuestaCompleta(completa(1))).toBe(true)
    expect(propuestaCompleta(sinValor(1))).toBe(false)
    expect(propuestaCompleta(conFaltantes(1))).toBe(false)
    expect(propuestaCompleta(sugerenciaDePrueba({ 1: 10, 2: 'ok' }, { estado: 'Validada' }))).toBe(false)
  })
})

describe('registrarEnBloque', () => {
  it('valida solo las completas, una a una, y da el resultado de cada informe', async () => {
    const propuestas = new Map([
      [1, completa(1)],
      [2, sinValor(2)],
      [3, sugerenciaDePrueba({ 1: 10, 2: 'ok' }, { id: 3, estado: 'Rechazada' })],
      [4, completa(4)],
    ])
    const validar = vi.fn(async (id: number) => {
      if (id === 4) throw new ErrorApi(409, null, 'Otra persona ya la decidió')
      return completa(id)
    })
    const resultados = await registrarEnBloque([1, 2, 3, 4], {
      obtener: async (id) => propuestas.get(id) ?? completa(id),
      validar,
    })
    expect(validar.mock.calls.map(([id]) => id)).toEqual([1, 4])
    expect(validar).toHaveBeenCalledWith(1, {
      decisiones: { campo_1: { accion: 'aceptar' }, campo_2: { accion: 'aceptar' } },
    })
    expect([...resultados].map(([id, r]) => [id, r.estado])).toEqual([
      [1, 'registrado'],
      [2, 'incompleto'],
      [3, 'sin-pendiente'],
      [4, 'fallo'],
    ])
    expect(resultados.get(4)?.detalle).toBe('Otra persona ya la decidió')
  })
})
