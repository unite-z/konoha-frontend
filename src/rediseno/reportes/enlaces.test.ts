import { describe, expect, it } from 'vitest'
import { RUTA_REPORTES, rutaReportes } from './enlaces'
import { frasesResumen } from './resumen'

describe('rutaReportes', () => {
  it('sin opciones es la ruta de Reportes', () => {
    expect(rutaReportes()).toBe(RUTA_REPORTES)
  })

  it('conserva los filtros, quita la página y sustituye el indicador y el informe', () => {
    expect(rutaReportes({ indicador: 'a', filtros: '?desde=2026-11-01&page=3&indicador=b&informe=x' })).toBe(
      `${RUTA_REPORTES}?desde=2026-11-01&indicador=a`,
    )
    expect(rutaReportes({ informe: 'material-vegetal', filtros: 'desde=2026-11-01' })).toBe(
      `${RUTA_REPORTES}?desde=2026-11-01&informe=material-vegetal`,
    )
  })
})

describe('frasesResumen', () => {
  it('una frase por indicador con datos y una sola con los que no tienen', () => {
    const indicador = (nombre: string, valor: string | null) => ({
      clave: 'actividades-por-estado' as const,
      indicador: { codigo: nombre, nombre, descripcion_calculo: '', meta: null, unidad: 'u' },
      valor,
      sin_datos: valor === null,
      mensaje_sin_datos: null,
      desglose: [],
      notas: [],
    })
    const panel = {
      periodo: { desde: '2026-11-23', hasta: '2026-11-29' },
      filtros_aplicados: {
        desde: '2026-11-23',
        hasta: '2026-11-29',
        area_verde_id: null,
        tipo_servicio_id: null,
        estado: null,
        modalidad: null,
      },
      generado_en: '2026-11-26T15:00:00Z',
      sin_datos: false,
      mensaje_sin_datos: null,
      notas: [],
      indicadores: [indicador('A', '12.5'), indicador('B', null), indicador('C', null)],
    }
    expect(frasesResumen(panel)).toEqual(['A: 12,5 u.', 'Sin datos en el periodo: B, C.'])
  })
})
