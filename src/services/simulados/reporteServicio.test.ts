import { afterEach, describe, expect, it, vi } from 'vitest'
import { calcularReporteServicio } from './reporteServicio'

const HOY = '2026-10-31'
const TRES_MESES = { desde: '2026-08-01', hasta: HOY }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('calcularReporteServicio (datos simulados de RF-REP-008)', () => {
  it('con Control fitosanitario en 3 meses llena las secciones salvo el rendimiento', () => {
    const r = calcularReporteServicio({ ...TRES_MESES, tipo_servicio_id: 2 }, HOY)
    expect(r.sin_datos).toBe(false)
    expect(r.atenciones.length).toBeGreaterThan(0)
    expect(r.avance.programadas + r.avance.extraordinarias).toBe(r.atenciones.length)
    expect(r.especies_plagas.sin_datos).toBe(false)
    expect(r.especies_plagas.elementos.every((e) => e.tipo === 'Plaga')).toBe(true)
    expect(r.conformidad.sin_datos).toBe(false)
    expect(r.rendimiento.sin_datos).toBe(true)
    // Dos proveedores en el periodo: la cabecera no elige uno.
    expect(r.servicio.proveedor).toBeNull()
  })

  it('el corte de césped tiene rendimiento en m²/h y no atiende ejemplares', () => {
    const r = calcularReporteServicio({ ...TRES_MESES, tipo_servicio_id: 1 }, HOY)
    expect(r.rendimiento.unidad_rendimiento).toBe('m²/h')
    expect(r.especies_plagas).toMatchObject({ sin_datos: true, mensaje_sin_datos: 'Este servicio no atiende ejemplares' })
    expect(r.servicio.contrato?.codigo).toBe('CT-2026-014')
  })

  it('respeta el proveedor y el periodo', () => {
    const todas = calcularReporteServicio({ ...TRES_MESES, tipo_servicio_id: 2 }, HOY).atenciones.length
    const deUno = calcularReporteServicio({ ...TRES_MESES, tipo_servicio_id: 2, proveedor_id: 102 }, HOY)
    expect(deUno.atenciones.length).toBeLessThan(todas)
    expect(deUno.servicio.proveedor?.nombre).toBe('Arbolistas del Sur E.I.R.L. (demo)')
    const fuera = calcularReporteServicio({ desde: '2025-01-01', hasta: '2025-01-31', tipo_servicio_id: 2 }, HOY)
    expect(fuera).toMatchObject({ sin_datos: true, atenciones: [] })
  })

  it('cuenta las atenciones sin evidencia', () => {
    const anio = { desde: '2026-01-01', hasta: HOY }
    const total = [1, 2, 3, 4].reduce(
      (suma, tipo) => suma + calcularReporteServicio({ ...anio, tipo_servicio_id: tipo }, HOY).atenciones_sin_evidencia,
      0,
    )
    expect(total).toBe(3)
  })

  it('?simular=vacio y ?simular=datos-insuficientes', () => {
    vi.stubGlobal('location', { search: '?simular=vacio' })
    expect(calcularReporteServicio({ ...TRES_MESES, tipo_servicio_id: 2 }, HOY).sin_datos).toBe(true)
    vi.stubGlobal('location', { search: '?simular=datos-insuficientes' })
    expect(calcularReporteServicio({ ...TRES_MESES, tipo_servicio_id: 2 }, HOY).conformidad.sin_datos).toBe(true)
  })

  it('rechaza un tipo de servicio que no es tercerizado', () => {
    expect(() => calcularReporteServicio({ ...TRES_MESES, tipo_servicio_id: 99 }, HOY)).toThrow('Elige un tipo de servicio')
  })
})
