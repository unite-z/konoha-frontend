import { describe, expect, it } from 'vitest'
import { construirUrlTercerizados } from './clienteTercerizados'
import { API_PLANIFICACION_URL } from './clientePlanificacion'
import { interpretarError } from './cliente'

describe('clientePlanificacion', () => {
  it('construye URLs sobre la base de MOD-03', () => {
    expect(construirUrlTercerizados('restricciones/', { desde: '2026-10-01', hasta: '2026-10-31' }, API_PLANIFICACION_URL))
      .toBe('/api/v1/planificacion/restricciones/?desde=2026-10-01&hasta=2026-10-31')
  })
})

describe('interpretarError con errores por campo', () => {
  it('conserva los mensajes de cada campo', () => {
    const error = interpretarError(400, { codigo: 'validacion', detalle: 'Datos no válidos', errores: { duracion_maxima_dias: ['Debe ser mayor que 0'] } })
    expect(error.codigo).toBe('validacion')
    expect(error.errores_campo).toEqual({ duracion_maxima_dias: ['Debe ser mayor que 0'] })
  })

  it('sigue leyendo errores de dominio sin campos', () => {
    expect(interpretarError(409, { codigo: 'servicio-no-periodico', detalle: 'x' }).errores_campo).toEqual({})
  })
})
