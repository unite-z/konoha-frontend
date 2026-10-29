import { describe, expect, it } from 'vitest'
import type { SesionCore } from '../types/core'
import { entradasMenu, puede } from './permisosCore'

function sesion(codigo: SesionCore['rol']['codigo'], permisos: string[]): SesionCore {
  return {
    usuario: { id: 1, nombre: 'Prueba', nombre_usuario: 'prueba@pucp.edu.pe' },
    rol: { codigo, nombre: codigo },
    permisos,
    debe_cambiar_contrasena: false,
    expira: null,
  }
}

// Permisos de cada rol tal como los carga V9__core_permisos.sql (extracto relevante para el menú).
const CAPATAZ = sesion('capataz', [
  'CORE.CATALOGO.CONSULTAR',
  'CORE.REPOSITORIO.CONSULTAR',
  'PLA.PLANIFICACION.CONSULTAR',
  'CAM.PARTE.REGISTRAR',
])
const PRACTICANTE = sesion('practicante', [
  'CORE.REPOSITORIO.CONSULTAR',
  'PLA.PLANIFICACION.CONSULTAR',
  'SER.CONTRATO.CONSULTAR',
  'SER.ATENCION.REGISTRAR',
  'REP.INDICADOR.CONSULTAR',
])
const JEFE = sesion('jefe-seccion', [...PRACTICANTE.permisos, 'CORE.USUARIO.GESTIONAR'])

describe('entradasMenu', () => {
  it('el menú del capataz no muestra usuarios, contratos ni conformidades (HU-MOD01-007)', () => {
    const menu = entradasMenu(CAPATAZ)
    expect(menu.has('usuarios')).toBe(false)
    expect(menu.has('tercerizados')).toBe(false)
    expect([...menu].sort()).toEqual(['planificacion', 'repositorio'])
  })

  it('solo el jefe ve «Usuarios y roles»', () => {
    expect(entradasMenu(PRACTICANTE).has('usuarios')).toBe(false)
    expect(entradasMenu(JEFE).has('usuarios')).toBe(true)
  })

  it('sin sesión no hay entradas', () => {
    expect(entradasMenu(null).size).toBe(0)
    expect(puede(null, 'CORE.USUARIO.GESTIONAR')).toBe(false)
  })
})
