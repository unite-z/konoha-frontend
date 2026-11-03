import { afterEach, describe, expect, it, vi } from 'vitest'
import { analizarSimulado, decidirSimulado, simularListarInconsistencias } from './inconsistenciasIa'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('datos simulados de RF-IA-002', () => {
  it('la bandeja mezcla los cuatro tipos y filtra por tipo y conjunto', async () => {
    const todas = await simularListarInconsistencias({})
    expect(new Set(todas.results.map((s) => s.contenido.tipo_hallazgo)).size).toBe(4)
    const duplicados = await simularListarInconsistencias({ tipo_hallazgo: 'Duplicado', conjunto: 'Ejemplares' })
    expect(duplicados.results.every((s) => s.contenido.tipo_hallazgo === 'Duplicado' && s.contenido.conjunto === 'Ejemplares')).toBe(true)
  })

  it('analizar añade de 2 a 4 hallazgos del conjunto elegido', () => {
    const resultado = analizarSimulado({ conjunto: 'Atenciones' })
    expect(resultado.hallazgos).toBeGreaterThanOrEqual(2)
    expect(resultado.hallazgos).toBeLessThanOrEqual(4)
    expect(resultado.sugerencias.every((s) => s.contenido.conjunto === 'Atenciones' && s.estado === 'Propuesta')).toBe(true)
  })

  it('?simular=vacio no encuentra nada; ?simular=datos-insuficientes deja la suficiencia parcial', () => {
    vi.stubGlobal('location', { search: '?simular=vacio' })
    expect(analizarSimulado({ conjunto: 'Ejemplares' })).toMatchObject({ hallazgos: 0, sugerencias: [] })
    vi.stubGlobal('location', { search: '?simular=datos-insuficientes' })
    const parcial = analizarSimulado({ conjunto: 'Ejemplares' })
    expect(parcial.sugerencias.every((s) => s.contenido.suficiencia === 'parcial' && s.contenido.faltantes.length > 0)).toBe(true)
  })

  it('decidir cambia el estado sin tocar los registros y no se puede repetir (criterio 3)', () => {
    const [nueva] = analizarSimulado({ conjunto: 'Proveedores' }).sugerencias
    const campos = structuredClone(nueva.contenido.registros.map((r) => r.campos))
    const aceptada = decidirSimulado(nueva.id, { accion: 'aceptar', valor_final: 'X', comentario: null })
    expect(aceptada.estado).toBe('Validada')
    expect(aceptada.contenido.registros.map((r) => r.campos)).toEqual(campos)
    expect(() => decidirSimulado(nueva.id, { accion: 'descartar', valor_final: null, comentario: null })).toThrow('ya fue revisado')
  })
})
