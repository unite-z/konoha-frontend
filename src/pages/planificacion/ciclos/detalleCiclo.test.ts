import { describe, expect, it } from 'vitest'
import type { Programacion } from '@/types/planificacion'
import { accionesCiclo, duracionCiclo, periodoCiclo, validarFechaReal } from './detalleCiclo'

const ciclo: Programacion = {
  id: 1,
  tipo_servicio_id: 2,
  servicio: 'Control fitosanitario',
  proveedor_id: null,
  proveedor: null,
  estacion: 'Primavera',
  fecha_inicio_prevista: '2026-11-02',
  fecha_fin_prevista: '2026-11-05',
  estado: 'EnCurso',
  fecha_inicio_real: '2026-11-03',
  fecha_fin_real: null,
}

describe('detalleCiclo', () => {
  it('ofrece las transiciones que permite el backend', () => {
    expect(accionesCiclo('Programada').map((a) => a.cambio)).toEqual(['cancelacion', 'inicio'])
    expect(accionesCiclo('EnCurso').map((a) => a.cambio)).toEqual(['fin'])
    expect(accionesCiclo('Completada')).toEqual([])
    expect(accionesCiclo('Cancelada')).toEqual([])
  })

  it('valida la fecha real: obligatoria, no futura y el fin no antes del inicio real', () => {
    expect(validarFechaReal('inicio', '', ciclo, '2026-11-04')).toBe('Indica la fecha.')
    expect(validarFechaReal('inicio', '2026-11-05', ciclo, '2026-11-04')).toBe('La fecha no puede ser posterior a hoy.')
    expect(validarFechaReal('fin', '2026-11-02', ciclo, '2026-11-04')).toMatch(/anterior al inicio/)
    expect(validarFechaReal('fin', '2026-11-04', ciclo, '2026-11-04')).toBeUndefined()
  })

  it('calcula la duración y el exceso según el estado', () => {
    expect(duracionCiclo(ciclo, '2026-11-04')).toMatchObject({ valor: '2 de 4', exceso: 0 })
    expect(duracionCiclo(ciclo, '2026-11-08')).toMatchObject({ valor: '6 de 4', exceso: 2 })
    expect(duracionCiclo({ ...ciclo, estado: 'Completada', fecha_fin_real: '2026-11-07' }, '2026-11-10')).toMatchObject({ valor: '5 días', exceso: 1 })
    expect(duracionCiclo({ ...ciclo, estado: 'Programada', fecha_inicio_real: null }, '2026-11-01')).toMatchObject({ valor: '4 días', exceso: 0 })
  })

  it('amplía el periodo de restricciones hasta hoy si el ciclo sigue en curso', () => {
    expect(periodoCiclo(ciclo, '2026-11-08')).toEqual({ desde: '2026-11-02', hasta: '2026-11-08' })
    expect(periodoCiclo({ ...ciclo, estado: 'Programada', fecha_inicio_real: null }, '2026-11-01')).toEqual({ desde: '2026-11-02', hasta: '2026-11-05' })
  })
})
