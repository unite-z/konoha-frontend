import { describe, expect, it } from 'vitest'
import type { ElementoPriorizado, PrioridadAtencion } from '../types/priorizacionIa'
import {
  cuerpoValidacion,
  decisionesCompletas,
  filtrarPorPrioridad,
  MENSAJES_PRIORIZACION,
  ordenarPorPuntuacion,
  resumenPrioridades,
  textoAlcance,
  textoDecisionFinal,
} from './priorizacionIa'

function elemento(clave: string, prioridad: PrioridadAtencion, puntuacion: number, nombre = clave): ElementoPriorizado {
  return {
    clave,
    tipo: 'Area',
    registro_id: 1,
    nombre,
    codigo: null,
    espacio: null,
    prioridad_sugerida: prioridad,
    puntuacion,
    motivos: [],
    sustento: {
      incidencias_abiertas: null,
      incidencias_ultimos_12_meses: null,
      dias_desde_ultima_atencion: null,
      frecuencia_mantenimiento_dias: null,
      dias_vencida: null,
      estado_sanitario: null,
      atenciones_ultimos_12_meses: null,
    },
    faltantes: [],
  }
}

const ELEMENTOS = [elemento('a', 'Media', 50), elemento('b', 'Alta', 90), elemento('c', 'Alta', 90, 'Aaa'), elemento('d', 'Baja', 10)]

describe('bandeja', () => {
  it('resumenPrioridades usa singular y plural y omite las vacías', () => {
    expect(resumenPrioridades(ELEMENTOS)).toBe('2 altas · 1 media · 1 baja')
    expect(resumenPrioridades([elemento('x', 'Media', 1)])).toBe('1 media')
    expect(resumenPrioridades([])).toBe('Sin elementos')
  })

  it('textoAlcance', () => {
    expect(textoAlcance('Ambos', 15)).toBe('Espacios y ejemplares · 15 días')
    expect(textoAlcance('Areas', 7)).toBe('Espacios (áreas y jardines) · 7 días')
  })
})

describe('ranking', () => {
  it('ordena por puntuación y, a igualdad, por nombre', () => {
    expect(ordenarPorPuntuacion(ELEMENTOS).map((e) => e.clave)).toEqual(['c', 'b', 'a', 'd'])
  })

  it('filtra por prioridad sugerida', () => {
    expect(filtrarPorPrioridad(ELEMENTOS, 'Alta').map((e) => e.clave)).toEqual(['b', 'c'])
    expect(filtrarPorPrioridad(ELEMENTOS, '')).toHaveLength(4)
  })
})

describe('decisiones', () => {
  const dos = [elemento('a', 'Media', 50), elemento('b', 'Alta', 90)]

  it('decisionesCompletas devuelve las claves que faltan y por qué', () => {
    expect(decisionesCompletas(dos, {})).toEqual({ a: MENSAJES_PRIORIZACION.sinDecision, b: MENSAJES_PRIORIZACION.sinDecision })
    expect(decisionesCompletas(dos, { a: { accion: 'corregir', prioridad: '' }, b: { accion: 'aceptar', prioridad: '' } })).toEqual({
      a: MENSAJES_PRIORIZACION.sinPrioridad,
    })
  })

  it('cuerpoValidacion limpia la prioridad si no se corrige y la exige al corregir', () => {
    expect(cuerpoValidacion(dos, { a: { accion: 'aceptar', prioridad: '' } })).toBeNull()
    expect(
      cuerpoValidacion(dos, { a: { accion: 'descartar', prioridad: 'Alta' }, b: { accion: 'corregir', prioridad: 'Baja' } }),
    ).toEqual({ por_elemento: { a: { accion: 'descartar' }, b: { accion: 'corregir', prioridad_final: 'Baja' } } })
  })

  it('textoDecisionFinal', () => {
    expect(textoDecisionFinal('Alta', { accion: 'aceptar', prioridad_final: null })).toBe('Aceptada: Alta')
    expect(textoDecisionFinal('Media', { accion: 'corregir', prioridad_final: 'Alta' })).toBe('Corregida: Media → Alta')
    expect(textoDecisionFinal('Baja', { accion: 'descartar', prioridad_final: null })).toBe('Descartada')
    expect(textoDecisionFinal('Baja', undefined)).toBe('Sin decisión')
  })
})
