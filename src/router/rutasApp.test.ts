import { describe, expect, it } from 'vitest'
import { RUTAS_PLANIFICACION, esRutaPlanificacion, esRutaTercerizados, rutaDetalleIndicador } from './rutasApp'

describe('esRutaTercerizados', () => {
  it('reconoce el prefijo exacto', () => {
    expect(esRutaTercerizados('/servicios-tercerizados')).toBe(true)
    expect(esRutaTercerizados('/servicios-tercerizados/atenciones/3')).toBe(true)
    expect(esRutaTercerizados('/servicios-tercerizadosX')).toBe(false)
    expect(esRutaTercerizados('/reportes-indicadores/reportes')).toBe(false)
  })
})

describe('rutas de MOD-03', () => {
  it('reconoce el prefijo exacto', () => {
    expect(esRutaPlanificacion('/planificacion')).toBe(true)
    expect(esRutaPlanificacion(RUTAS_PLANIFICACION.restricciones)).toBe(true)
    expect(esRutaPlanificacion('/planificacionX')).toBe(false)
  })
})

describe('reportes de gestión del MOD-06', () => {
  it('construye la ruta del detalle de un indicador', () => {
    expect(rutaDetalleIndicador('consumo-materiales')).toBe('/reportes-indicadores/panel/consumo-materiales')
  })
})
