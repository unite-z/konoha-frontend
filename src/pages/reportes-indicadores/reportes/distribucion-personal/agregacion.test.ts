import { describe, expect, it } from 'vitest'
import type { FilaDistribucion } from '../../../../types/reportes'
import { formatearNumero } from '../../../../utils/formato'
import {
  agrupar,
  escalaEje,
  claveCelda,
  cuadrillasDistintas,
  filasSinTiempo,
  formatearMedida,
  matrizCuadrillaJornada,
  nivelIntensidad,
  totalizar,
} from './agregacion'

function fila(cambios: Partial<FilaDistribucion>): FilaDistribucion {
  return {
    jornada: '2026-10-20',
    cuadrilla_id: 1,
    cuadrilla_nombre: 'Cuadrilla 1',
    capataz_id: 10,
    capataz_nombre: 'Ana Pérez',
    clase_actividad_id: 100,
    clase_actividad_nombre: 'Mantenimiento',
    tipo_actividad_id: 1000,
    tipo_actividad_nombre: 'Poda',
    area_verde_id: 50,
    area_verde_nombre: 'Jardín central',
    numero_actividades: 1,
    operarios: [{ operario_id: 1, nombre_completo: 'Luis', es_apoyo: false }],
    numero_operarios: 1,
    tiempo_minutos: 60,
    horas_persona: 1,
    superficie_m2: 10,
    ...cambios,
  }
}

const OPERARIO_2 = { operario_id: 2, nombre_completo: 'Rosa', es_apoyo: false }

describe('totalizar', () => {
  it('cuenta operarios distintos y suma las medidas', () => {
    const t = totalizar([
      fila({}),
      fila({ operarios: [{ operario_id: 1, nombre_completo: 'Luis', es_apoyo: false }, OPERARIO_2], horas_persona: 2.5 }),
    ])
    expect(t).toEqual({ operarios: 2, horas_persona: 3.5, tiempo_minutos: 120, superficie_m2: 20, numero_actividades: 2 })
  })

  it('deja nulo lo que ninguna fila tiene', () => {
    const t = totalizar([fila({ tiempo_minutos: null, horas_persona: null, superficie_m2: null })])
    expect(t.tiempo_minutos).toBeNull()
    expect(t.horas_persona).toBeNull()
    expect(t.superficie_m2).toBeNull()
  })

  it('redondea a dos decimales', () => {
    expect(totalizar([fila({ horas_persona: 0.1 }), fila({ horas_persona: 0.2 })]).horas_persona).toBe(0.3)
  })
})

describe('agrupar', () => {
  const filas = [
    fila({ cuadrilla_id: 1, cuadrilla_nombre: 'Cuadrilla 1', horas_persona: 1 }),
    fila({ cuadrilla_id: 2, cuadrilla_nombre: 'Cuadrilla 2', horas_persona: 5, jornada: '2026-10-19' }),
    fila({ cuadrilla_id: 2, cuadrilla_nombre: 'Cuadrilla 2', horas_persona: 1, tipo_actividad_id: 1001, tipo_actividad_nombre: 'Riego' }),
  ]

  it('ordena de mayor a menor según la medida', () => {
    const grupos = agrupar(filas, 'cuadrilla', 'horas_persona')
    expect(grupos.map((g) => [g.texto, g.totales.horas_persona])).toEqual([
      ['Cuadrilla 2', 6],
      ['Cuadrilla 1', 1],
    ])
  })

  it('ordena la jornada por fecha', () => {
    expect(agrupar(filas, 'jornada', 'horas_persona').map((g) => g.clave)).toEqual(['2026-10-19', '2026-10-20'])
  })

  it('agrupa los tipos dentro de cada clase', () => {
    const [clase] = agrupar(filas, 'actividad', 'horas_persona')
    expect(clase.texto).toBe('Mantenimiento')
    expect(clase.subgrupos?.map((t) => [t.texto, t.totales.horas_persona])).toEqual([
      ['Poda', 6],
      ['Riego', 1],
    ])
  })

  it('agrupa los vacíos con su propio texto', () => {
    const [g] = agrupar([fila({ area_verde_id: null, area_verde_nombre: null })], 'espacio', 'operarios')
    expect(g.texto).toBe('Sin espacio')
  })
})

describe('matrizCuadrillaJornada', () => {
  it('crea una celda por cuadrilla y jornada con actividades', () => {
    const m = matrizCuadrillaJornada([
      fila({ cuadrilla_id: 2, cuadrilla_nombre: 'Cuadrilla 2', jornada: '2026-10-21' }),
      fila({ cuadrilla_id: 1, cuadrilla_nombre: 'Cuadrilla 1' }),
    ])
    expect(m.cuadrillas.map((c) => c.texto)).toEqual(['Cuadrilla 1', 'Cuadrilla 2'])
    expect(m.jornadas).toEqual(['2026-10-20', '2026-10-21'])
    expect(m.celdas.has(claveCelda('1', '2026-10-20'))).toBe(true)
    expect(m.celdas.has(claveCelda('1', '2026-10-21'))).toBe(false)
  })
})

describe('nivelIntensidad', () => {
  it('reparte en cuartos del máximo', () => {
    expect(nivelIntensidad(null, 10)).toBe(0)
    expect(nivelIntensidad(0, 10)).toBe(0)
    expect(nivelIntensidad(1, 10)).toBe(1)
    expect(nivelIntensidad(5, 10)).toBe(2)
    expect(nivelIntensidad(7.6, 10)).toBe(4)
    expect(nivelIntensidad(10, 10)).toBe(4)
  })
})

describe('auxiliares', () => {
  it('filtra las filas sin tiempo y cuenta cuadrillas', () => {
    const filas = [fila({ tiempo_minutos: null }), fila({ cuadrilla_id: 2 })]
    expect(filasSinTiempo(filas)).toHaveLength(1)
    expect(cuadrillasDistintas(filas)).toBe(2)
  })

  it('formatea cada medida', () => {
    expect(formatearMedida(2.5, 'horas_persona')).toBe(`${formatearNumero(2.5, 2)} h`)
    expect(formatearMedida(10, 'superficie_m2')).toBe('10 m²')
    expect(formatearMedida(90, 'tiempo_minutos')).toBe('1 h 30 min')
    expect(formatearMedida(null, 'operarios')).toBe('—')
  })
})

describe('escalaEje', () => {
  it('redondea a cuatro pasos limpios', () => {
    expect(escalaEje(0, 'horas_persona')).toBe(0)
    expect(escalaEje(37, 'horas_persona')).toBe(40)
    expect(escalaEje(7.3, 'superficie_m2')).toBe(8)
    expect(escalaEje(130, 'superficie_m2')).toBe(200)
    expect(escalaEje(0.6, 'horas_persona')).toBe(0.8)
  })

  it('no usa pasos decimales en cifras enteras', () => {
    expect(escalaEje(3, 'operarios')).toBe(4)
    expect(escalaEje(1, 'numero_actividades')).toBe(4)
  })

  it('usa horas completas en el tiempo', () => {
    expect(escalaEje(500, 'tiempo_minutos')).toBe(20 * 60)
    expect(escalaEje(400, 'tiempo_minutos')).toBe(8 * 60)
    expect(escalaEje(45, 'tiempo_minutos')).toBe(80)
  })
})
