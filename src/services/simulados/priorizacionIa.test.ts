import { afterEach, describe, expect, it, vi } from 'vitest'
import { elementosDe, rechazarSimulado, solicitarSimulado, validarSimulado } from './priorizacionIa'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('datos simulados de RN-IA-002', () => {
  it('el alcance y el espacio filtran los elementos, ordenados por puntuación', () => {
    const ambos = elementosDe({ alcance: 'Ambos', horizonte_dias: 15 })
    expect(ambos).toHaveLength(12)
    expect(ambos.map((e) => e.puntuacion)).toEqual([...ambos.map((e) => e.puntuacion)].sort((a, b) => b - a))
    expect(elementosDe({ alcance: 'Ejemplares', horizonte_dias: 7 }).every((e) => e.tipo === 'Ejemplar')).toBe(true)
    expect(elementosDe({ alcance: 'Areas', area_verde_id: 12, horizonte_dias: 7 }).map((e) => e.nombre)).toEqual(['Tontódromo'])
  })

  it('la prioridad es coherente con el sustento', () => {
    const elementos = elementosDe({ alcance: 'Ambos', horizonte_dias: 15 })
    const especial = elementos.find((e) => e.sustento.estado_sanitario === 'Atención fitosanitaria especial')
    expect(especial?.prioridad_sugerida).toBe('Alta')
    const plaza = elementos.find((e) => e.nombre === 'Plaza de Letras')
    expect(plaza?.prioridad_sugerida).toBe('Baja')
  })

  it('?simular=datos-insuficientes deja la suficiencia insuficiente, con faltantes y sustento a null', () => {
    vi.stubGlobal('location', { search: '?simular=datos-insuficientes' })
    const propuesta = solicitarSimulado({ alcance: 'Areas', horizonte_dias: 7 })
    expect(propuesta.contenido.suficiencia).toBe('insuficiente')
    expect(propuesta.contenido.faltantes.length).toBeGreaterThan(0)
    expect(propuesta.contenido.elementos.some((e) => e.sustento.dias_desde_ultima_atencion === null)).toBe(true)
  })

  it('validar exige todas las decisiones y no se puede repetir', () => {
    const propuesta = solicitarSimulado({ alcance: 'Areas', area_verde_id: 11, horizonte_dias: 7 })
    expect(() => validarSimulado(propuesta.id, { por_elemento: {} })).toThrow('Falta la decisión de 1 elementos')
    const clave = propuesta.contenido.elementos[0].clave
    const validada = validarSimulado(propuesta.id, { por_elemento: { [clave]: { accion: 'corregir', prioridad_final: 'Baja' } } })
    expect(validada.estado).toBe('Validada')
    expect(validada.contenido.decision?.por_elemento[clave]).toEqual({ accion: 'corregir', prioridad_final: 'Baja' })
    expect(validada.contenido.decision?.resumen).toEqual({ aceptados: 0, corregidos: 1, descartados: 0 })
    expect(() => validarSimulado(propuesta.id, { por_elemento: {} })).toThrow('ya fue revisada')
  })

  it('rechazar guarda el motivo', () => {
    const propuesta = solicitarSimulado({ alcance: 'Ejemplares', horizonte_dias: 30 })
    const rechazada = rechazarSimulado(propuesta.id, 'Ya está programado')
    expect(rechazada.estado).toBe('Rechazada')
    expect(rechazada.contenido.decision?.motivo_rechazo).toBe('Ya está programado')
  })
})
