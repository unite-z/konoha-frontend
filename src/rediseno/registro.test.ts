import { describe, expect, it } from 'vitest'
import { PERMISOS } from '@/config/permisosCore'
import * as rutasApp from '@/router/rutasApp'
import * as rutasCampo from '@/router/rutasCampo'
import { PREFIJO_REDISENO } from './prefijo'
import { SECCIONES_REDISENO, seccionesDeCabecera, seccionesVisibles } from './registro'

describe('registro del diseño nuevo (AV-420)', () => {
  it('reúne las 7 carpetas y la cabecera tiene las 5 secciones en orden', () => {
    expect(SECCIONES_REDISENO.map((s) => s.id)).toEqual([
      'mapa',
      'planificacion',
      'incidencias',
      'proveedores',
      'reportes',
      'cuenta',
      'campo',
    ])
    expect(seccionesDeCabecera(Object.values(PERMISOS)).map((s) => s.etiqueta)).toEqual([
      'Mapa',
      'Planificación',
      'Incidencias',
      'Proveedores',
      'Reportes',
    ])
  })

  it('cada ruta cuelga de /n y no se repite', () => {
    const rutas = SECCIONES_REDISENO.map((s) => s.ruta)
    expect(new Set(rutas).size).toBe(rutas.length)
    for (const ruta of rutas) expect(ruta.startsWith(`${PREFIJO_REDISENO}/`)).toBe(true)
  })

  it('filtra por código de permiso, nunca por rol', () => {
    expect(seccionesDeCabecera([])).toEqual([])
    expect(seccionesDeCabecera([PERMISOS.consultarIndicadores]).map((s) => s.id)).toEqual(['reportes'])
    expect(seccionesVisibles([]).map((s) => s.id)).toEqual(['cuenta'])
    expect(seccionesVisibles([PERMISOS.consultarCuadrillas]).map((s) => s.id)).toEqual(['cuenta', 'campo'])
  })

  it('ninguna ruta actual cae bajo /n', () => {
    const actuales: string[] = []
    const recoger = (valor: unknown) => {
      if (typeof valor === 'string') actuales.push(valor)
      else if (valor && typeof valor === 'object') Object.values(valor).forEach(recoger)
    }
    recoger({ ...rutasApp, ...rutasCampo })
    expect(actuales).toContain(rutasApp.RUTAS_CORE.ingreso)
    expect(actuales).toContain(rutasApp.RUTAS_CORE.configuracionApariencia)
    const choques = actuales.filter((r) => r === PREFIJO_REDISENO || r.startsWith(`${PREFIJO_REDISENO}/`))
    expect(choques).toEqual([])
  })
})
