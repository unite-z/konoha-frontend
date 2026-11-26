import { matchRoutes } from 'react-router'
import { describe, expect, it } from 'vitest'
import * as rutasApp from '@/router/rutasApp'
import * as rutasCampo from '@/router/rutasCampo'
import { rutaRediseno } from '../rutas'
import { destinoRediseno, RUTAS_QUE_SE_CONSERVAN } from './redirecciones'

/** Todas las rutas antiguas que declaran las constantes y funciones `ruta*()` de `rutasApp.ts` y `rutasCampo.ts`. */
function rutasAntiguas(): string[] {
  const rutas = new Set<string>()
  const anadir = (valor: unknown) => {
    if (typeof valor === 'string' && valor.startsWith('/')) rutas.add(valor.split(/[?#]/)[0] ?? valor)
  }
  for (const [nombre, valor] of Object.entries({ ...rutasApp, ...rutasCampo })) {
    if (typeof valor === 'string') anadir(valor)
    else if (typeof valor === 'function' && nombre.startsWith('ruta')) {
      try {
        anadir((valor as (id: number) => unknown)(7))
      } catch {
        // funciones que no construyen una ruta a partir de un id (p. ej. el ingreso con retorno)
      }
    } else if (valor && typeof valor === 'object') Object.values(valor).forEach(anadir)
  }
  return [...rutas]
}

describe('redirecciones del diseño nuevo (AV-425)', () => {
  const antiguas = rutasAntiguas()

  it('el recorrido de las constantes encuentra rutas', () => {
    expect(antiguas.length).toBeGreaterThan(0)
  })

  it('ninguna ruta antigua se queda sin destino', () => {
    const sinDestino = antiguas.filter((ruta) => !RUTAS_QUE_SE_CONSERVAN.includes(ruta) && !destinoRediseno(ruta))
    expect(sinDestino).toEqual([])
  })

  it('cada destino existe de verdad bajo /n y no cae en el comodín', () => {
    for (const ruta of antiguas) {
      const destino = destinoRediseno(ruta)
      if (!destino) continue
      const coincidencias = matchRoutes([rutaRediseno], destino.pathname)
      expect(coincidencias?.at(-1)?.route.path, ruta).not.toBe('*')
      expect(coincidencias, ruta).not.toBeNull()
    }
  })

  it('el ingreso y el cambio de contraseña se conservan', () => {
    expect(destinoRediseno(rutasApp.RUTAS_CORE.ingreso)).toBeNull()
    expect(destinoRediseno(rutasApp.RUTAS_CORE.cambiarContrasena)).toBeNull()
    expect(destinoRediseno('/no-existe')).toBeNull()
  })

  it('conserva la consulta y añade los parámetros del plan sin pisar los existentes', () => {
    expect(destinoRediseno('/areas-verdes/mapa', '?area=5&poligono=9')).toEqual({
      pathname: '/n/mapa',
      search: '?area=5&poligono=9',
    })
    expect(destinoRediseno('/areas-verdes/12/editar')).toEqual({ pathname: '/n/mapa', search: '?area=12' })
    expect(destinoRediseno('/areas-verdes/nueva')).toEqual({ pathname: '/n/mapa', search: '?registrar=1' })
    expect(destinoRediseno('/incidencias', '?incidencia_id=3')).toEqual({
      pathname: '/n/incidencias',
      search: '?incidencia_id=3',
    })
    expect(destinoRediseno('/incidencias/4', '?reportar=2')).toEqual({
      pathname: '/n/incidencias',
      search: '?reportar=2&incidencia=4',
    })
    expect(destinoRediseno('/mis-incidencias', '?reportar=')).toEqual({
      pathname: '/n/incidencias',
      search: '?reportar=',
    })
    expect(destinoRediseno('/operacion-campo/participantes', '?encargo_id=8')).toEqual({
      pathname: '/n/planificacion',
      search: '?encargo_id=8',
    })
    expect(destinoRediseno('/servicios-tercerizados/atenciones/6')).toEqual({
      pathname: '/n/proveedores',
      search: '?atencion_id=6',
    })
    expect(destinoRediseno('/reportes-indicadores/reportes/cumplimiento-corte', '?tipo=corte&mes=2026-11')).toEqual({
      pathname: '/n/reportes',
      search: '?tipo=corte&mes=2026-11',
    })
    expect(destinoRediseno('/reportes-indicadores/mapa-atenciones', '?mes=2026-11')?.search).toBe(
      '?mes=2026-11&capa=atenciones',
    )
  })

  it('la ruta literal gana a la que lleva comodín', () => {
    expect(destinoRediseno('/areas-verdes/campanas-poda/nueva')?.pathname).toBe('/n/mapa')
    expect(destinoRediseno('/servicios-tercerizados/proveedores-contratos/proveedores/nuevo')?.pathname).toBe(
      '/n/proveedores',
    )
  })

  it('cada asistente de IA vive en su módulo', () => {
    expect(destinoRediseno('/reportes-indicadores/asistencia-ia/priorizacion/3')?.pathname).toBe('/n/incidencias')
    expect(destinoRediseno('/reportes-indicadores/asistencia-ia/cronograma')?.pathname).toBe('/n/planificacion')
    expect(destinoRediseno('/reportes-indicadores/asistencia-ia/evidencia-fitosanitaria')?.pathname).toBe(
      '/n/proveedores',
    )
  })
})
