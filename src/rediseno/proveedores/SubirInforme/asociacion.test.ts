import { describe, expect, it } from 'vitest'
import { asociar, motivoPorRevisar, tieneInformeAdjunto } from './asociacion'

describe('asociar', () => {
  it('coincide si la atención espera el informe o su subsanación', () => {
    expect(asociar({ estado: 'Ejecutado pendiente de reporte' })).toBe('coincide')
    expect(asociar({ estado: 'Observado' })).toBe('coincide')
  })

  it('queda por revisar si la atención no existe o no espera informe', () => {
    expect(asociar(null)).toBe('por-revisar')
    expect(asociar({ estado: 'En ejecución' })).toBe('por-revisar')
    expect(asociar({ estado: 'Reporte adjunto' })).toBe('por-revisar')
    expect(asociar({ estado: 'Conforme / cerrado' })).toBe('por-revisar')
  })

  it('explica el motivo', () => {
    expect(motivoPorRevisar(null, 7)).toContain('n.º 7')
    expect(motivoPorRevisar({ estado: 'Reporte adjunto', codigo: 'ATN-1' }, 7)).toContain('«Reporte adjunto»')
  })
})

describe('tieneInformeAdjunto', () => {
  it('solo cuenta desde que hay un informe', () => {
    expect(tieneInformeAdjunto({ estado: 'En ejecución' })).toBe(false)
    expect(tieneInformeAdjunto({ estado: 'Ejecutado pendiente de reporte' })).toBe(false)
    expect(tieneInformeAdjunto({ estado: 'Reporte adjunto' })).toBe(true)
    expect(tieneInformeAdjunto({ estado: 'Observado' })).toBe(true)
  })
})
