import { describe, expect, it } from 'vitest'
import {
  RUTAS,
  RUTAS_PLANIFICACION,
  RUTAS_TERCERIZADOS,
  destinoTrasIngreso,
  esRutaPlanificacion,
  esRutaReportesGestion,
  esRutaTercerizados,
  rutaDetalleAtencion,
  rutaDetalleIndicador,
  rutaIngreso,
} from './rutasApp'

const BANDEJA = RUTAS_TERCERIZADOS.atenciones

describe('esRutaTercerizados', () => {
  it('reconoce el prefijo exacto', () => {
    expect(esRutaTercerizados('/servicios-tercerizados')).toBe(true)
    expect(esRutaTercerizados('/servicios-tercerizados/atenciones/3')).toBe(true)
    expect(esRutaTercerizados('/servicios-tercerizadosX')).toBe(false)
    expect(esRutaTercerizados('/reportes-indicadores/reportes')).toBe(false)
  })
})

describe('destinoTrasIngreso', () => {
  it('acepta rutas internas de MOD-05 con consulta', () => {
    expect(destinoTrasIngreso(rutaDetalleAtencion(7))).toBe('/servicios-tercerizados/atenciones/7')
    expect(destinoTrasIngreso(`${BANDEJA}?estado=En%20ejecuci%C3%B3n`)).toBe(`${BANDEJA}?estado=En%20ejecuci%C3%B3n`)
  })

  it.each([
    null,
    '',
    'https://malicioso.example/servicios-tercerizados',
    '//malicioso.example/servicios-tercerizados',
    '/\\malicioso.example',
    'servicios-tercerizados/atenciones',
    '/reportes-indicadores/reportes',
    RUTAS_TERCERIZADOS.ingreso,
    `${RUTAS_TERCERIZADOS.ingreso}?volver=/x`,
    '/servicios-tercerizados/atenciones\n',
  ])('devuelve la bandeja para %j', (volver) => {
    expect(destinoTrasIngreso(volver)).toBe(BANDEJA)
  })
})

describe('rutaIngreso', () => {
  it('codifica el destino válido', () => {
    expect(rutaIngreso('/servicios-tercerizados/atenciones/7?x=1')).toBe(
      '/servicios-tercerizados/ingreso?volver=%2Fservicios-tercerizados%2Fatenciones%2F7%3Fx%3D1',
    )
  })

  it('omite destinos no válidos o vacíos', () => {
    expect(rutaIngreso()).toBe(RUTAS_TERCERIZADOS.ingreso)
    expect(rutaIngreso('//otro.example')).toBe(RUTAS_TERCERIZADOS.ingreso)
  })
})

describe('rutas de MOD-03', () => {
  it('reconoce el prefijo exacto', () => {
    expect(esRutaPlanificacion('/planificacion')).toBe(true)
    expect(esRutaPlanificacion(RUTAS_PLANIFICACION.restricciones)).toBe(true)
    expect(esRutaPlanificacion('/planificacionX')).toBe(false)
  })

  it('permite volver a una ruta de planificación tras ingresar', () => {
    expect(destinoTrasIngreso(`${RUTAS_PLANIFICACION.servicios}?x=1`)).toBe(`${RUTAS_PLANIFICACION.servicios}?x=1`)
    expect(rutaIngreso(RUTAS_PLANIFICACION.restricciones)).toBe(
      `/servicios-tercerizados/ingreso?volver=${encodeURIComponent(RUTAS_PLANIFICACION.restricciones)}`,
    )
  })
})

describe('reportes de gestión del MOD-06', () => {
  it.each([
    '/reportes-indicadores/panel',
    '/reportes-indicadores/panel/atenciones-por-espacio',
    '/reportes-indicadores/mapa-atenciones',
    '/reportes-indicadores/reportes/material-vegetal',
  ])('exige sesión en %s', (ruta) => {
    expect(esRutaReportesGestion(ruta)).toBe(true)
  })

  it.each([
    '/reportes-indicadores/reportes',
    '/reportes-indicadores/reportes/cumplimiento-corte',
    '/reportes-indicadores/panelX',
    '/reportes-indicadores/asistencia-ia',
  ])('no exige sesión en %s', (ruta) => {
    expect(esRutaReportesGestion(ruta)).toBe(false)
  })

  it('permite volver al panel o al mapa tras ingresar', () => {
    expect(destinoTrasIngreso(`${RUTAS.panel}?desde=2026-10-01`)).toBe(`${RUTAS.panel}?desde=2026-10-01`)
    expect(rutaIngreso(RUTAS.mapaAtenciones)).toBe(
      `/servicios-tercerizados/ingreso?volver=${encodeURIComponent(RUTAS.mapaAtenciones)}`,
    )
  })

  it('construye la ruta del detalle de un indicador', () => {
    expect(rutaDetalleIndicador('consumo-materiales')).toBe('/reportes-indicadores/panel/consumo-materiales')
  })
})
