import { describe, expect, it } from 'vitest'
import type { PropuestaCronograma, RestriccionConsiderada } from '../types/cronogramaIa'
import {
  agruparPorSemana,
  coincideConProhibicion,
  crucesConProgramado,
  fechasEfectivas,
  cuerpoConfirmacion,
  MENSAJES_CRONOGRAMA,
  mesSiguiente,
  recursosDisponibles,
  resumenConfirmacion,
  textoCambios,
  textoResumenConfirmacion,
  validarDecisiones,
  valoresDePropuesta,
} from './cronogramaIa'

const PROHIBICION: RestriccionConsiderada = {
  fecha_inicio: '2026-11-23',
  fecha_fin: '2026-12-05',
  tipo: 'Prohibicion',
  descripcion: 'Evaluaciones finales',
  espacio: 'Explanada de Ciencias',
}

function propuesta(clave: string, inicio: string, cambios: Partial<PropuestaCronograma> = {}): PropuestaCronograma {
  return {
    clave,
    tipo_servicio_id: 1,
    actividad: 'Corte de césped',
    area_verde_id: 11,
    ubicacion: 'Jardín Central',
    fecha_inicio: inicio,
    fecha_fin: inicio,
    recursos: { modalidad: 'PersonalPropio', cuadrilla_id: 1, cuadrilla: 'Cuadrilla 1', proveedor_id: null, proveedor: null, operarios: 4 },
    motivo: '',
    coincidencias: [],
    ...cambios,
  }
}

describe('agruparPorSemana', () => {
  it('agrupa de lunes a domingo y en orden', () => {
    const semanas = agruparPorSemana([propuesta('c', '2026-11-09'), propuesta('a', '2026-11-02'), propuesta('b', '2026-11-08')])
    expect(semanas.map((s) => [s.lunes, s.domingo, s.propuestas.map((p) => p.clave)])).toEqual([
      ['2026-11-02', '2026-11-08', ['a', 'b']],
      ['2026-11-09', '2026-11-15', ['c']],
    ])
    expect(semanas[0].titulo).toBe('Semana del 02 nov. al 08 nov.')
  })
})

describe('decisiones', () => {
  const prohibida = propuesta('p', '2026-11-24', { coincidencias: [PROHIBICION] })
  const normal = propuesta('n', '2026-11-03')

  it('coincideConProhibicion', () => {
    expect(coincideConProhibicion(prohibida)).toBe(true)
    expect(coincideConProhibicion(normal)).toBe(false)
  })

  it('validarDecisiones exige decisión, cambios al modificar y la confirmación de RI-25', () => {
    expect(validarDecisiones([normal, prohibida], {})).toEqual({ n: MENSAJES_CRONOGRAMA.sinDecision, p: MENSAJES_CRONOGRAMA.sinDecision })
    expect(
      validarDecisiones([normal, prohibida], {
        n: { accion: 'corregir', valores: null, confirma: false },
        p: { accion: 'aceptar', valores: null, confirma: false },
      }),
    ).toEqual({ n: MENSAJES_CRONOGRAMA.sinValores, p: MENSAJES_CRONOGRAMA.sinConfirmar })
    expect(validarDecisiones([prohibida], { p: { accion: 'descartar', valores: null, confirma: false } })).toEqual({})
  })

  it('cuerpoConfirmacion solo envía valores al modificar y la confirmación cuando hace falta', () => {
    const valores = { ...valoresDePropuesta(normal), fecha_inicio: '2026-11-05', fecha_fin: '2026-11-05' }
    expect(
      cuerpoConfirmacion([normal, prohibida], {
        n: { accion: 'corregir', valores, confirma: true },
        p: { accion: 'aceptar', valores: null, confirma: true },
      }),
    ).toEqual({
      por_propuesta: {
        n: { accion: 'corregir', valores_finales: valores, confirma_restriccion: false },
        p: { accion: 'aceptar', valores_finales: null, confirma_restriccion: true },
      },
    })
    expect(cuerpoConfirmacion([prohibida], { p: { accion: 'aceptar', valores: null, confirma: false } })).toBeNull()
  })

  it('resumen de la confirmación', () => {
    const r = resumenConfirmacion([{ accion: 'aceptar' }, { accion: 'aceptar' }, { accion: 'corregir' }, { accion: 'descartar' }, undefined])
    expect(r).toEqual({ aceptadas: 2, modificadas: 1, descartadas: 1, programar: 3 })
    expect(textoResumenConfirmacion(r)).toBe('Se programarán 3 actividades: 2 aceptadas y 1 modificadas. 1 descartadas.')
  })
})

describe('textoCambios', () => {
  it('describe solo lo que cambió', () => {
    const p = propuesta('a', '2026-11-04')
    const nombres = { espacio: () => 'Tontódromo', cuadrilla: (id: number | null) => `Cuadrilla ${id}`, proveedor: () => '' }
    expect(textoCambios(p, { ...valoresDePropuesta(p), fecha_inicio: '2026-11-06', fecha_fin: '2026-11-06', cuadrilla_id: 2 }, nombres)).toBe(
      '04 nov. → 06 nov.; Cuadrilla 1 → Cuadrilla 2',
    )
    expect(textoCambios(p, valoresDePropuesta(p), nombres)).toBe('Sin cambios')
  })
})

describe('recursos y calendario', () => {
  it('recursosDisponibles sin repetir', () => {
    const tercerizada = propuesta('t', '2026-11-03', {
      recursos: { modalidad: 'Tercerizado', cuadrilla_id: null, cuadrilla: null, proveedor_id: 101, proveedor: 'Verde Campus', operarios: null },
    })
    expect(recursosDisponibles([propuesta('a', '2026-11-02'), propuesta('b', '2026-11-03'), tercerizada])).toEqual({
      cuadrillas: [{ id: 1, nombre: 'Cuadrilla 1' }],
      proveedores: [{ id: 101, nombre: 'Verde Campus' }],
    })
  })

  it('mesSiguiente en Lima', () => {
    expect(mesSiguiente(new Date('2026-12-01T03:00:00Z'))).toEqual({ desde: '2026-12-01', hasta: '2026-12-31' })
  })
})

describe('calendario semanal', () => {
  it('fechasEfectivas usa las fechas modificadas', () => {
    const p = propuesta('a', '2026-11-04')
    expect(fechasEfectivas(p, null)).toEqual({ desde: '2026-11-04', hasta: '2026-11-04' })
    expect(fechasEfectivas(p, { ...valoresDePropuesta(p), fecha_inicio: '2026-11-06', fecha_fin: '2026-11-07' })).toEqual({
      desde: '2026-11-06',
      hasta: '2026-11-07',
    })
  })

  it('crucesConProgramado solo cuenta el mismo espacio con fechas solapadas', () => {
    const existentes = [
      { id: 1, area_verde_id: 11, fecha_inicio: '2026-11-03', fecha_fin: '2026-11-03' },
      { id: 2, area_verde_id: 12, fecha_inicio: '2026-11-03', fecha_fin: '2026-11-03' },
      { id: 3, area_verde_id: 11, fecha_inicio: '2026-11-10', fecha_fin: '2026-11-10' },
    ]
    expect(crucesConProgramado({ area_verde_id: 11, desde: '2026-11-02', hasta: '2026-11-04' }, existentes).map((e) => e.id)).toEqual([1])
    expect(crucesConProgramado({ area_verde_id: null, desde: '2026-11-02', hasta: '2026-11-04' }, existentes)).toEqual([])
  })
})
