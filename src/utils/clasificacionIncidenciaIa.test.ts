import { describe, expect, it } from 'vitest'
import type { ValoresClasificacion } from '../types/clasificacionIncidenciaIa'
import {
  camposADecidir,
  camposSinDecidir,
  cuerpoValidacion,
  insigniaSeveridad,
  MENSAJES_CLASIFICACION,
  resumenClasificacion,
  resumenCorto,
  validarManual,
  valoresRegistrados,
  VALORES_VACIOS,
} from './clasificacionIncidenciaIa'

const SUGERENCIA: ValoresClasificacion = {
  tipo_evento: 'Incidencia',
  categoria: 'Arbolado',
  severidad: 'Alta',
  via_atencion: 'Tercerizado',
  es_sencilla: null,
}

describe('insigniaSeveridad', () => {
  it('nunca solo color: texto e icono o punto', () => {
    expect(insigniaSeveridad('Alta')).toEqual({ tono: 'error', texto: 'Alta', icono: 'triangle-alert' })
    expect(insigniaSeveridad('Media')).toMatchObject({ tono: 'aviso', texto: 'Media' })
    expect(insigniaSeveridad('Baja')).toEqual({ tono: 'neutro', texto: 'Baja' })
  })
})

describe('decisiones por campo', () => {
  it('se deciden los sugeridos y los obligatorios', () => {
    expect(camposADecidir(SUGERENCIA)).toEqual(['tipo_evento', 'categoria', 'severidad', 'via_atencion'])
    expect(camposADecidir({ ...VALORES_VACIOS, categoria: 'Riego', es_sencilla: true })).toEqual([
      'tipo_evento',
      'categoria',
      'severidad',
      'via_atencion',
      'es_sencilla',
    ])
  })

  it('camposSinDecidir: falta decidir, falta valor, obligatorio descartado y aceptar sin sugerencia', () => {
    const sinSeveridad = { ...SUGERENCIA, severidad: null }
    expect(
      camposSinDecidir(sinSeveridad, {
        tipo_evento: { accion: 'descartar', valor: null },
        categoria: { accion: 'corregir', valor: '' },
        severidad: { accion: 'aceptar', valor: null },
      }),
    ).toEqual({
      tipo_evento: MENSAJES_CLASIFICACION.obligatorio,
      categoria: MENSAJES_CLASIFICACION.sinValor,
      severidad: MENSAJES_CLASIFICACION.sinSugerencia,
      via_atencion: MENSAJES_CLASIFICACION.sinDecision,
    })
  })

  it('valores registrados y cuerpo de la validación', () => {
    const decisiones = {
      tipo_evento: { accion: 'aceptar' as const, valor: null },
      categoria: { accion: 'descartar' as const, valor: null },
      severidad: { accion: 'corregir' as const, valor: 'Media' },
      via_atencion: { accion: 'aceptar' as const, valor: null },
    }
    expect(valoresRegistrados(SUGERENCIA, decisiones)).toEqual({
      tipo_evento: 'Incidencia',
      categoria: null,
      severidad: 'Media',
      via_atencion: 'Tercerizado',
      es_sencilla: null,
    })
    expect(cuerpoValidacion(SUGERENCIA, decisiones)).toEqual({
      por_campo: {
        tipo_evento: { accion: 'aceptar', valor_final: null },
        categoria: { accion: 'descartar', valor_final: null },
        severidad: { accion: 'corregir', valor_final: 'Media' },
        via_atencion: { accion: 'aceptar', valor_final: null },
      },
    })
    expect(cuerpoValidacion(SUGERENCIA, {})).toBeNull()
  })
})

describe('resúmenes y manual', () => {
  it('resumen largo y corto', () => {
    expect(resumenClasificacion(SUGERENCIA)).toBe('Categoría: Incidencia (Arbolado) · Prioridad: Alta · Atención: Servicio especializado')
    expect(resumenCorto(SUGERENCIA)).toBe('Alta · Servicio especializado')
    expect(resumenCorto(null)).toBe('Sin sugerencia')
  })

  it('la clasificación manual exige los obligatorios', () => {
    expect(Object.keys(validarManual(VALORES_VACIOS))).toEqual(['tipo_evento', 'severidad', 'via_atencion'])
    expect(validarManual(SUGERENCIA)).toEqual({})
  })
})
