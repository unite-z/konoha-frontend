import { describe, expect, it } from 'vitest'
import type { Programacion } from '@/types/planificacion'
import { accionesCiclo, duracionCiclo, indicadoresCiclo, indicadorRestricciones, periodoCiclo, subtituloCiclo, textoRequerimiento, validarFechaReal } from './detalleCiclo'

const ciclo: Programacion = {
  id: 1,
  tipo_servicio_id: 2,
  servicio: 'Control fitosanitario',
  proveedor_id: null,
  proveedor: null,
  estacion: 'Primavera',
  fecha_inicio_prevista: '2026-11-02',
  fecha_fin_prevista: '2026-11-05',
  estado: 'EnCurso',
  fecha_inicio_real: '2026-11-03',
  fecha_fin_real: null,
}

describe('detalleCiclo', () => {
  it('dice el requerimiento generado o por qué no se generó (AV-263, Figma 373-5779)', () => {
    expect(textoRequerimiento({ ...ciclo, requerimiento: { id: 5, codigo: 'AT-1a2b3c4d5e6f', estado: 'Requerimiento registrado' } })).toBe(
      'requerimiento AT-1a2b3c4d generado en Servicios tercerizados',
    )
    expect(textoRequerimiento({ ...ciclo, motivo_sin_requerimiento: 'Ningún jardín de la ruta está en el catálogo de MOD-05' })).toBe(
      'sin requerimiento en Servicios tercerizados: ningún jardín de la ruta está en el catálogo de MOD-05',
    )
    expect(textoRequerimiento(ciclo)).toBeNull()
  })

  it('ofrece las transiciones que permite el backend', () => {
    expect(accionesCiclo('Programada').map((a) => a.cambio)).toEqual(['cancelacion', 'inicio'])
    expect(accionesCiclo('EnCurso').map((a) => a.cambio)).toEqual(['fin'])
    expect(accionesCiclo('Completada')).toEqual([])
    expect(accionesCiclo('Cancelada')).toEqual([])
  })

  it('valida la fecha real: obligatoria, no futura y el fin no antes del inicio real', () => {
    expect(validarFechaReal('inicio', '', ciclo, '2026-11-04')).toBe('Indica la fecha.')
    expect(validarFechaReal('inicio', '2026-11-05', ciclo, '2026-11-04')).toBe('La fecha no puede ser posterior a hoy.')
    expect(validarFechaReal('fin', '2026-11-02', ciclo, '2026-11-04')).toMatch(/anterior al inicio/)
    expect(validarFechaReal('fin', '2026-11-04', ciclo, '2026-11-04')).toBeUndefined()
  })

  it('calcula la duración y el exceso según el estado', () => {
    expect(duracionCiclo(ciclo, '2026-11-04')).toMatchObject({ valor: '2 de 4', exceso: 0 })
    expect(duracionCiclo(ciclo, '2026-11-08')).toMatchObject({ valor: '6 de 4', exceso: 2 })
    expect(duracionCiclo({ ...ciclo, estado: 'Completada', fecha_fin_real: '2026-11-07' }, '2026-11-10')).toMatchObject({ valor: '5 días', exceso: 1 })
    expect(duracionCiclo({ ...ciclo, estado: 'Programada', fecha_inicio_real: null }, '2026-11-01')).toMatchObject({ valor: '4 días', exceso: 0 })
  })

  it('amplía el periodo de restricciones hasta hoy si el ciclo sigue en curso', () => {
    expect(periodoCiclo(ciclo, '2026-11-08')).toEqual({ desde: '2026-11-02', hasta: '2026-11-08' })
    expect(periodoCiclo({ ...ciclo, estado: 'Programada', fecha_inicio_real: null }, '2026-11-01')).toEqual({ desde: '2026-11-02', hasta: '2026-11-05' })
  })
})

describe('detalle como en Figma (380-7171)', () => {
  const fito = {
    id: 2,
    nombre: 'Control fitosanitario',
    es_ruidoso: false,
    frecuencias: [],
    duracion: { duracion_maxima_dias: 1, dias_limpieza: 0, hora_inicio: '06:00:00', hora_fin: '18:00:00', fecha_modificacion: '2026-10-01T10:00:00-05:00', modificado_por: 'jefe' },
  }
  const enCurso = { ...ciclo, servicio: 'Control fitosanitario', proveedor: 'Fumigaciones Demo S.A.', fecha_inicio_prevista: '2026-11-30', fecha_fin_prevista: '2026-11-30', fecha_inicio_real: '2026-11-30', estado: 'EnCurso' as const }

  it('pone proveedor, fechas y franja bajo el título', () => {
    expect(subtituloCiclo(enCurso, fito)).toBe('Fumigaciones Demo S.A. · 30/11 · 06:00 a 18:00')
  })

  it('en curso da inicio real, duración con máximo y franja, y restricciones', () => {
    expect(indicadoresCiclo(enCurso, fito, [], '2026-11-30').map((i) => [i.etiqueta, i.valor, i.contexto, i.nota])).toEqual([
      ['Inicio real', '30/11', 'En curso', 'Previsto a las 06:00'],
      ['Duración', '1 día', 'Máximo 1 día', 'Franja 06:00 a 18:00'],
      ['Restricciones', 'Ninguna', 'Sin conflictos', undefined],
    ])
  })

  it('cuenta avisos y prohibiciones con sus días', () => {
    const base = { id: 1, tipo_restriccion_id: 1, tipo: 'Jueves', aplica_servicios_ruidosos: true, hora_inicio: null, hora_fin: null, area_verde_id: null, descripcion: null, serie: null }
    expect(indicadorRestricciones([{ ...base, efecto: 'Advertencia', fecha_inicio: '2026-11-19', fecha_fin: '2026-11-19' }])).toMatchObject({ valor: '1 aviso', contexto: 'Jue 19 · con constancia' })
    expect(
      indicadorRestricciones([
        { ...base, efecto: 'Advertencia', fecha_inicio: '2026-11-19', fecha_fin: '2026-11-19' },
        { ...base, id: 2, efecto: 'Prohibicion', fecha_inicio: '2026-11-15', fecha_fin: '2026-11-15' },
      ]),
    ).toMatchObject({ valor: '1 aviso y 1 prohibición', contexto: 'Jue 19 y Dom 15' })
  })
})
