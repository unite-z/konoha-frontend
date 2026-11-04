import { describe, expect, it } from 'vitest'
import type { Restriccion, ServicioPeriodico } from '@/types/planificacion'
import { conflictosDelPeriodo, diasDelPeriodo, franjaDeDias, mesesVentana, textoDuracion, textoVentana, validarProgramacion, ventanaLibre } from './programarCiclo'

const corte: ServicioPeriodico = {
  id: 1,
  nombre: 'Corte de césped',
  es_ruidoso: true,
  frecuencias: [],
  duracion: { duracion_maxima_dias: 3, dias_limpieza: 1, hora_inicio: null, hora_fin: null, fecha_modificacion: '2026-10-01T10:00:00-05:00', modificado_por: 'jefe' },
}

function restriccion(parcial: Partial<Restriccion>): Restriccion {
  return {
    id: 1,
    tipo_restriccion_id: 1,
    tipo: 'Jueves culturales',
    efecto: 'Advertencia',
    aplica_servicios_ruidosos: true,
    fecha_inicio: '2026-11-12',
    fecha_fin: '2026-11-12',
    hora_inicio: null,
    hora_fin: null,
    area_verde_id: null,
    descripcion: null,
    serie: null,
    ...parcial,
  }
}

const jueves = restriccion({})
const examen = restriccion({ id: 2, tipo: 'Examen de admisión', efecto: 'Prohibicion', fecha_inicio: '2026-11-15', fecha_fin: '2026-11-15', aplica_servicios_ruidosos: false })
const feriado = restriccion({ id: 3, tipo: 'Feriado', efecto: 'Favorable', fecha_inicio: '2026-11-13', fecha_fin: '2026-11-13' })

describe('conflictosDelPeriodo', () => {
  it('deja avisos y prohibiciones que se solapan; las de ruidosos solo si el servicio lo es', () => {
    expect(conflictosDelPeriodo([jueves, examen, feriado], '2026-11-11', '2026-11-14', true).map((r) => r.id)).toEqual([1])
    expect(conflictosDelPeriodo([jueves, examen], '2026-11-11', '2026-11-16', false).map((r) => r.id)).toEqual([2])
  })
})

describe('validarProgramacion', () => {
  it('con aviso exige justificación y con texto deja guardar', () => {
    const sin = validarProgramacion(corte, '2026-11-11', '2026-11-14', [jueves], '')
    expect([sin.requiereJustificacion, sin.errorJustificacion, sin.puedeGuardar]).toEqual([true, 'Justifica por qué se programa en estas fechas.', false])
    expect(validarProgramacion(corte, '2026-11-11', '2026-11-14', [jueves], 'Solo hay cuadrilla esa semana').puedeGuardar).toBe(true)
  })

  it('una prohibición bloquea aunque haya justificación', () => {
    const v = validarProgramacion(corte, '2026-11-13', '2026-11-16', [examen], 'motivo')
    expect([v.prohibiciones.length, v.puedeGuardar]).toEqual([1, false])
  })

  it('bloquea el periodo inválido y la duración excedida (3 de servicio más 1 de limpieza)', () => {
    expect(validarProgramacion(corte, '2026-11-14', '2026-11-11', [], '').errorPeriodo).toBe('Debe ser posterior al inicio')
    const excedido = validarProgramacion(corte, '2026-11-11', '2026-11-15', [], '')
    expect([excedido.errorPeriodo, excedido.diasExcedidos]).toEqual(['5 días: máximo 3 + 1 de limpieza', '5 días seleccionados'])
    expect(validarProgramacion(corte, '', '2026-11-15', [], '').puedeGuardar).toBe(false)
    expect(validarProgramacion(corte, '2026-11-11', '2026-11-11', [], 'x'.repeat(301)).errorJustificacion).toBe('Máximo 300 caracteres.')
  })

  it('con ventana de tercerizado, las fechas tienen que caer en ese mes', () => {
    expect(validarProgramacion(corte, '2026-11-11', '2026-11-14', [], '', '2026-11').puedeGuardar).toBe(true)
    const fuera = validarProgramacion(corte, '2026-11-30', '2026-12-02', [], '', '2026-11')
    expect([fuera.errorVentana, fuera.puedeGuardar]).toEqual(['Las fechas tienen que caer en el mes de la ventana', false])
    expect(mesesVentana('2026-11-16')).toEqual([
      { valor: '2026-11', texto: 'Noviembre 2026' },
      { valor: '2026-12', texto: 'Diciembre 2026' },
      { valor: '2027-01', texto: 'Enero 2027' },
    ])
  })
})

describe('textos y franja', () => {
  it('describe la duración, los días y la ventana libre', () => {
    expect(textoDuracion(corte)).toBe('4 días: 3 de corte + 1 de limpieza')
    expect(textoDuracion({ ...corte, nombre: 'Poda' })).toBe('4 días: 3 de servicio + 1 de limpieza')
    expect(diasDelPeriodo('2026-11-11', '2026-11-14')).toBe(4)
    const ventana = ventanaLibre('2026-11-16', corte)
    expect(ventana).toEqual({ inicio: '2026-11-16', fin: '2026-11-19' })
    expect(ventana && textoVentana(ventana)).toBe('16 al 19/11')
    expect(ventanaLibre(null, corte)).toBeNull()
  })

  it('marca los días del periodo y las restricciones en la franja', () => {
    const franja = franjaDeDias('2026-11-11', '2026-11-14', [jueves, examen])
    expect(franja).toHaveLength(10)
    expect(franja[0]).toMatchObject({ fecha: '2026-11-09', letra: 'L', seleccionado: false })
    expect(franja.filter((d) => d.seleccionado).map((d) => d.dia)).toEqual([11, 12, 13, 14])
    expect(franja.find((d) => d.dia === 12)?.restriccion).toBe('aviso')
    expect(franja.find((d) => d.dia === 15)?.restriccion).toBe('prohibicion')
  })
})
