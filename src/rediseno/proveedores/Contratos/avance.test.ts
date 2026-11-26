import { describe, expect, it } from 'vitest'
import type { ContratoMaestro } from '@/types/maestrosTercerizados'
import { avanceDeAtenciones, avanceDelContrato, enCurso } from './avance'

const base = { atenciones: 5 } as ContratoMaestro

describe('avance del contrato', () => {
  it('usa los campos del backend (RD-16) cuando llegan', () => {
    const avance = avanceDelContrato({
      ...base,
      atenciones_conformes: 2,
      atenciones_observadas: 1,
      atenciones_pendientes: 1,
    })
    expect(avance).toEqual({
      total: 5,
      conformes: 2,
      observadas: 1,
      pendientes: 1,
    })
    expect(avance && enCurso(avance)).toBe(1)
  })

  it('sin RD-16 devuelve null y se calcula con las atenciones', () => {
    expect(avanceDelContrato(base)).toBeNull()
    const avance = avanceDeAtenciones([
      { estado: 'Conforme / cerrado' },
      { estado: 'Conforme / cerrado' },
      { estado: 'Observado' },
      { estado: 'Reporte adjunto' },
      { estado: 'En ejecución' },
    ])
    expect(avance).toEqual({
      total: 5,
      conformes: 2,
      observadas: 1,
      pendientes: 1,
    })
  })

  it('un contrato sin atenciones tiene el avance a cero', () => {
    expect(avanceDeAtenciones([])).toEqual({
      total: 0,
      conformes: 0,
      observadas: 0,
      pendientes: 0,
    })
  })
})
