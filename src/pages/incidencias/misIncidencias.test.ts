import { describe, expect, it } from 'vitest'
import { cuandoReportada } from './misIncidencias'

describe('misIncidencias', () => {
  it('dice cuándo se reportó, como en Figma 391-8522', () => {
    const ahora = Date.parse('2026-11-04T12:00:00-05:00')
    expect(cuandoReportada('2026-11-04T11:30:00-05:00', '2026-11-04', ahora)).toBe('ahora')
    expect(cuandoReportada('2026-11-04T08:00:00-05:00', '2026-11-04', ahora)).toBe('hoy')
    expect(cuandoReportada('2026-11-03T18:00:00-05:00', '2026-11-04', ahora)).toBe('ayer')
    expect(cuandoReportada('2026-10-12T09:00:00-05:00', '2026-11-04', ahora)).toBe('12/10')
  })
})
