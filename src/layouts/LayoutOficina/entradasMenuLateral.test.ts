import { describe, expect, it } from 'vitest'
import { RUTAS_CAMPO } from '@/router/rutasCampo'
import {
  RUTAS,
  RUTAS_CORE,
  RUTAS_INVENTARIO,
  RUTAS_PLANIFICACION,
  RUTAS_TERCERIZADOS,
  rutaDetalleAtencion,
  rutaDetalleIndicador,
  rutaDetalleUsuario,
  rutaRevisionExtraccion,
} from '@/router/rutasApp'
import { MODULOS_MENU, activoEnMenu, hijosVisibles, seccionesMoviles } from './entradasMenuLateral'

/** Todas las rutas con menú de la aplicación, más ejemplos de rutas con parámetros. */
const RUTAS_CON_MENU = [
  ...Object.values(RUTAS),
  ...Object.values(RUTAS_INVENTARIO),
  ...Object.values(RUTAS_TERCERIZADOS),
  ...Object.values(RUTAS_PLANIFICACION),
  ...Object.values(RUTAS_CAMPO).filter((ruta) => ruta !== RUTAS_CAMPO.ingreso),
  RUTAS_CORE.usuarios,
  RUTAS_CORE.accesos,
  RUTAS_CORE.repositorio,
  rutaDetalleAtencion(7),
  rutaDetalleIndicador('cumplimiento'),
  rutaDetalleUsuario(3),
  rutaRevisionExtraccion(12),
]

describe('activoEnMenu', () => {
  it.each(RUTAS_CON_MENU)('%s marca exactamente un módulo, y la entrada activa es suya', (ruta) => {
    const { modulo, hijo } = activoEnMenu(ruta)

    expect(modulo).not.toBeNull()
    const marcados = MODULOS_MENU.filter((m) => m === modulo)
    expect(marcados).toHaveLength(1)
    if (hijo) expect(modulo?.hijos).toContain(hijo)
  })

  it('una subruta marca su entrada y no la del padre («Coberturas», no «Inventario de áreas»)', () => {
    expect(activoEnMenu(RUTAS_INVENTARIO.coberturas).hijo?.texto).toBe('Coberturas vegetales')
    expect(activoEnMenu(RUTAS_INVENTARIO.areasVerdes).hijo?.texto).toBe('Inventario de áreas')
    expect(activoEnMenu(`${RUTAS.reportes}/cumplimiento-corte`).hijo?.texto).toBe('Reportes')
    expect(activoEnMenu(rutaDetalleUsuario(3)).hijo?.texto).toBe('Usuarios')
  })

  it('ignora la consulta y no confunde prefijos parecidos', () => {
    expect(activoEnMenu(`${RUTAS_TERCERIZADOS.atenciones}?estado=abierta`).hijo?.texto).toBe('Atenciones')
    expect(activoEnMenu('/repositorios').modulo).toBeNull()
  })

  it('las rutas sin menú no marcan nada', () => {
    expect(activoEnMenu('/')).toEqual({ modulo: null, hijo: null })
    expect(activoEnMenu(RUTAS_CORE.ingreso)).toEqual({ modulo: null, hijo: null })
  })
})

describe('seccionesMoviles', () => {
  it('devuelve las subentradas con enlace del módulo activo, como mucho 5', () => {
    expect(seccionesMoviles(RUTAS_PLANIFICACION.calendario).map((s) => s.texto)).toEqual([
      'Resumen',
      'Calendario',
      'Ciclos',
      'Configuración',
    ])
    expect(seccionesMoviles(RUTAS.panel)).toHaveLength(5)
    expect(seccionesMoviles(RUTAS_CORE.repositorio)).toEqual([])
    expect(seccionesMoviles('/')).toEqual([])
  })
})

describe('Roles y permisos en el menú (AV-381)', () => {
  const usuarios = MODULOS_MENU.find((m) => m.clave === 'usuarios')?.hijos ?? []
  it('solo la ve quien tiene CORE.ROL.GESTIONAR', () => {
    expect(hijosVisibles(usuarios, ['CORE.USUARIO.GESTIONAR']).map((h) => h.texto)).not.toContain('Roles y permisos')
    expect(hijosVisibles(usuarios, ['CORE.USUARIO.GESTIONAR', 'CORE.ROL.GESTIONAR']).map((h) => h.texto)).toContain('Roles y permisos')
  })
})
