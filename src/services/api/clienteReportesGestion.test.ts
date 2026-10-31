import { describe, expect, it } from 'vitest'
import { construirUrlTercerizados } from './clienteTercerizados'
import { API_REPORTES_GESTION_URL } from './clienteReportesGestion'
import { interpretarError } from './cliente'

const MENSAJE_ORDEN = 'La fecha de fin debe ser igual o posterior a la fecha de inicio'

describe('clienteReportesGestion', () => {
  it('construye URLs sobre la base de los reportes de gestión y omite los vacíos', () => {
    expect(
      construirUrlTercerizados('panel/', { desde: '2026-10-01', hasta: '2026-10-31', estado: '' }, API_REPORTES_GESTION_URL),
    ).toBe('/api/v1/reportes/panel/?desde=2026-10-01&hasta=2026-10-31')
  })
})

describe('interpretarError con los errores de los reportes de gestión', () => {
  it('conserva el mensaje del periodo en su campo', () => {
    const error = interpretarError(400, { codigo: 'periodo-invalido', detalle: MENSAJE_ORDEN, errores: { hasta: [MENSAJE_ORDEN] } })
    expect(error.codigo).toBe('periodo-invalido')
    expect(error.errores_campo.hasta).toEqual([MENSAJE_ORDEN])
  })

  it('reconoce el 401 sin credenciales', () => {
    const error = interpretarError(401, { codigo: 'no-autenticado', detalle: 'Credenciales inválidas o ausentes' })
    expect(error.estado).toBe(401)
    expect(error.codigo).toBe('no-autenticado')
  })
})
