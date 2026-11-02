import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApi } from '../api/cliente'
import {
  crearAlmacenSimulado,
  DEMORA_SIMULADA_MS,
  errorDeEscenario,
  escenarioSimulado,
  responderSimulado,
} from './simulacion'

describe('escenarioSimulado', () => {
  it('lee ?simular= y descarta los valores desconocidos', () => {
    expect(escenarioSimulado('?simular=vacio')).toBe('vacio')
    expect(escenarioSimulado('?a=1&simular=sin-permiso')).toBe('sin-permiso')
    expect(escenarioSimulado('?simular=otro')).toBeNull()
    expect(escenarioSimulado('')).toBeNull()
  })
})

describe('errorDeEscenario', () => {
  it('devuelve el error de cada escenario genérico', () => {
    expect(errorDeEscenario('error')?.estado).toBe(500)
    expect(errorDeEscenario('sin-permiso')?.estado).toBe(403)
    expect(errorDeEscenario('sin-sesion')?.estado).toBe(401)
    expect(errorDeEscenario('ia-no-disponible', true)?.codigo).toBe('ia-no-disponible')
  })

  it('no afecta fuera de la IA ni en los escenarios de dominio', () => {
    expect(errorDeEscenario('ia-no-disponible', false)).toBeNull()
    expect(errorDeEscenario('vacio')).toBeNull()
    expect(errorDeEscenario(null)).toBeNull()
  })
})

describe('responderSimulado', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('resuelve tras la demora con una copia de los datos', async () => {
    const datos = { valor: [1, 2] }
    const promesa = responderSimulado(() => datos)
    await vi.advanceTimersByTimeAsync(DEMORA_SIMULADA_MS)
    const resultado = await promesa
    expect(resultado).toEqual(datos)
    expect(resultado).not.toBe(datos)
  })

  it('rechaza si la señal ya estaba cancelada', async () => {
    const controlador = new AbortController()
    controlador.abort()
    await expect(responderSimulado(() => 1, { signal: controlador.signal })).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('rechaza si se cancela durante la espera', async () => {
    const controlador = new AbortController()
    const promesa = responderSimulado(() => 1, { signal: controlador.signal })
    const comprobacion = expect(promesa).rejects.toMatchObject({ name: 'AbortError' })
    await vi.advanceTimersByTimeAsync(DEMORA_SIMULADA_MS / 2)
    controlador.abort()
    await comprobacion
  })

  it('lanza el error del escenario de la URL', async () => {
    vi.stubGlobal('location', { search: '?simular=sin-permiso' })
    const promesa = responderSimulado(() => 1)
    const comprobacion = expect(promesa).rejects.toBeInstanceOf(ErrorApi)
    await vi.advanceTimersByTimeAsync(DEMORA_SIMULADA_MS)
    await comprobacion
  })

  it('ia-no-disponible solo rechaza las llamadas de IA', async () => {
    vi.stubGlobal('location', { search: '?simular=ia-no-disponible' })
    const normal = responderSimulado(() => 'ok')
    const ia = responderSimulado(() => 'ok', { esIa: true })
    const comprobacion = expect(ia).rejects.toMatchObject({ estado: 503 })
    await vi.advanceTimersByTimeAsync(DEMORA_SIMULADA_MS)
    await expect(normal).resolves.toBe('ok')
    await comprobacion
  })
})

describe('crearAlmacenSimulado', () => {
  it('guarda, obtiene y calcula el siguiente id', () => {
    const almacen = crearAlmacenSimulado([{ id: 3, texto: 'a' }])
    expect(almacen.siguienteId()).toBe(4)
    almacen.guardar({ id: 4, texto: 'b' })
    expect(almacen.obtener(4)?.texto).toBe('b')
    expect(almacen.listar()).toHaveLength(2)
    expect(crearAlmacenSimulado<{ id: number }>([]).siguienteId()).toBe(1)
  })
})
