import { describe, expect, it } from 'vitest'
import { agruparPorModulo, diferenciaPermisos } from './permisosRol'

describe('permisos por rol (AV-381)', () => {
  it('agrupa por módulo en orden y ordena por descripción', () => {
    const grupos = agruparPorModulo([
      { codigo: 'PLA.CORTE.REGISTRAR', modulo: 'MOD-03', descripcion: 'Registrar el corte', es_sensible: false },
      { codigo: 'CORE.USUARIO.GESTIONAR', modulo: 'MOD-01', descripcion: 'Gestionar usuarios', es_sensible: true },
      { codigo: 'CORE.CATALOGO.CONSULTAR', modulo: 'MOD-01', descripcion: 'Consultar catálogos', es_sensible: false },
    ])
    expect(grupos.map((g) => g.modulo)).toEqual(['MOD-01 · Core y seguridad', 'MOD-03 · Planificación, corte e incidencias'])
    expect(grupos[0].permisos.map((p) => p.codigo)).toEqual(['CORE.CATALOGO.CONSULTAR', 'CORE.USUARIO.GESTIONAR'])
  })

  it('dice qué se añade y qué se quita', () => {
    expect(diferenciaPermisos(['A', 'B'], ['B', 'C'])).toEqual({ anadidos: ['C'], quitados: ['A'] })
    expect(diferenciaPermisos(['A'], ['A'])).toEqual({ anadidos: [], quitados: [] })
  })
})
