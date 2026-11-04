import { afterEach, describe, expect, it, vi } from 'vitest'
import { buscarActividadesSimulado, confirmarSimulado, descartarSimulado, estimar, manualSimulado, solicitarSimulado } from './estimacionIa'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('datos simulados de RF-IA-004', () => {
  it('estima de forma determinista según el tipo y la superficie', () => {
    expect(estimar(5, 1600, 'Media')).toMatchObject({ operarios_sugeridos: 4, duracion: 1, unidad_duracion: 'jornadas' })
    expect(estimar(6, 900, 'Media')).toMatchObject({ operarios_min: 2, operarios_max: 3, duracion: 6, unidad_duracion: 'horas' })
    expect(estimar(5, 1600, 'Media')).toEqual(estimar(5, 1600, 'Media'))
  })

  it('busca actividades por código, tipo o espacio', () => {
    expect(buscarActividadesSimulado('ficus').results.map((a) => a.codigo)).toEqual(['ENC-2026-044'])
    expect(buscarActividadesSimulado('').count).toBe(8)
  })

  it('?simular=datos-insuficientes: sin antecedentes y con una estimación genérica', () => {
    vi.stubGlobal('location', { search: '?simular=datos-insuficientes' })
    const s = solicitarSimulado({ actividad_id: 4100 })
    expect(s.contenido).toMatchObject({ suficiencia: 'insuficiente', antecedentes: [] })
    expect(s.contenido.estimacion).not.toBeNull()
    expect(s.contenido.faltantes.length).toBeGreaterThan(0)
  })

  it('confirmar guarda la diferencia y no se puede repetir', () => {
    const s = solicitarSimulado({ actividad_id: 4101 })
    const sugeridos = s.contenido.estimacion?.operarios_sugeridos ?? 0
    const confirmada = confirmarSimulado(s.id, {
      acciones: { operarios: 'corregir', duracion: 'aceptar', insumos: 'descartar' },
      confirmado: { operarios: sugeridos + 1, duracion: s.contenido.estimacion?.duracion ?? 0, unidad_duracion: 'horas', insumos: [] },
    })
    expect(confirmada.estado).toBe('Validada')
    expect(confirmada.contenido.decision?.diferencia.operarios).toBe(1)
    expect(() => descartarSimulado(s.id)).toThrow('ya fue revisada')
  })

  it('el registro manual queda confirmado sin estimación', () => {
    const s = manualSimulado({ actividad_id: 4102, confirmado: { operarios: 2, duracion: 4, unidad_duracion: 'horas', insumos: [] } })
    expect(s.estado).toBe('Validada')
    expect(s.contenido.estimacion).toBeNull()
    expect(s.contenido.decision?.acciones).toEqual({ operarios: 'corregir', duracion: 'corregir', insumos: 'corregir' })
  })
})
