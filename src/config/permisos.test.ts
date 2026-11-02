import { describe, expect, it } from 'vitest'
import type { SesionCore } from '../types/core'
import { puedeExportar } from './permisos'

function sesion(permisos: string[]): SesionCore {
  return {
    usuario: { id: 1, nombre: 'Prueba', nombre_usuario: 'prueba@pucp.edu.pe' },
    rol: { codigo: 'jefe-seccion', nombre: 'Jefe de sección' },
    permisos,
    debe_cambiar_contrasena: false,
    expira: null,
  }
}

describe('puedeExportar (RF-REP-009)', () => {
  it('con el backend exige REP.INDICADOR.EXPORTAR', () => {
    expect(puedeExportar(sesion(['REP.INDICADOR.EXPORTAR']), false)).toBe(true)
    expect(puedeExportar(sesion(['REP.INDICADOR.CONSULTAR']), false)).toBe(false)
  })

  it('con datos simulados basta el permiso de consulta', () => {
    expect(puedeExportar(sesion(['REP.INDICADOR.CONSULTAR']), true)).toBe(true)
    expect(puedeExportar(sesion(['CORE.REPOSITORIO.CONSULTAR']), true)).toBe(false)
    expect(puedeExportar(null, true)).toBe(false)
  })
})
