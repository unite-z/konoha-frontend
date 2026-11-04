import { describe, expect, it } from 'vitest'
import { cicloCorteSimulado } from '@/services/simulados/corte'
import type { Programacion, ServicioPeriodico } from '@/types/planificacion'
import { avanceRuta, cortadosPorDia, esCorte, indicadoresCorte, momento, porCortar, textoMarcado, ultimaMarca } from './corte'

const ciclo: Programacion = {
  id: 1,
  tipo_servicio_id: 1,
  servicio: 'Corte de césped',
  proveedor_id: 4,
  proveedor: 'Servicios Verdes Demo S.A.C.',
  estacion: 'Primavera',
  fecha_inicio_prevista: '2026-11-16',
  fecha_fin_prevista: '2026-11-19',
  estado: 'EnCurso',
  fecha_inicio_real: '2026-11-16',
  fecha_fin_real: null,
}
const corte: ServicioPeriodico = {
  id: 1,
  nombre: 'Corte de césped',
  es_ruidoso: true,
  frecuencias: [],
  duracion: { duracion_maxima_dias: 3, dias_limpieza: 1, hora_inicio: null, hora_fin: null, fecha_modificacion: '2026-10-01T10:00:00-05:00', modificado_por: 'jefe' },
}
const datos = cicloCorteSimulado(ciclo)

describe('detalle del corte (Figma 346-1334 y 371-4306)', () => {
  it('reconoce el corte y cuenta el avance de la ruta', () => {
    expect([esCorte('Corte de césped'), esCorte('Poda')]).toEqual([true, false])
    expect(avanceRuta(datos.jardines)).toEqual({ cortados: 28, total: 45, porcentaje: 62 })
    expect(porCortar(datos.jardines)).toHaveLength(17)
  })

  it('dice la última marca y la destaca si pasan más de 24 h', () => {
    expect(ultimaMarca(datos.jardines, '2026-11-17T11:00')).toEqual({ texto: 'Última marca hoy 10:42', desfasada: false })
    expect(ultimaMarca(datos.jardines, '2026-11-18T12:50')).toEqual({ texto: 'Actualizado ayer 10:42 · hace 26 h', desfasada: true })
    expect(ultimaMarca([], '2026-11-17T11:00').texto).toBe('Sin marcas todavía')
    expect(momento('2026-11-15T09:00:00-05:00', '2026-11-17T11:00')).toBe('15/11 09:00')
  })

  it('cuenta los cortados por día y explica cada marca', () => {
    expect(cortadosPorDia(datos.jardines, '2026-11-16', '2026-11-18').map((d) => [d.texto, d.cortados])).toEqual([
      ['Lun 16', 15],
      ['Mar 17', 13],
      ['Mié 18', 0],
    ])
    const [j014] = datos.jardines
    expect(textoMarcado(j014, '2026-11-17T11:00')).toBe('Hoy 10:42 · J. Ramos')
    expect(textoMarcado(datos.jardines.find((j) => j.codigo === 'J-031') ?? j014, '2026-11-17T11:00')).toBe('Detenido por interrupción')
  })

  it('da avance, duración «Día 2 de 4» e interrupciones', () => {
    expect(indicadoresCorte(ciclo, corte, datos, '2026-11-17', '2026-11-17T11:00').map((i) => [i.valor, i.contexto, i.nota])).toEqual([
      ['62 %', '28 de 45 jardines', 'Última marca hoy 10:42'],
      ['Día 2 de 4', '3 de corte + 1 de limpieza', '0,5 días de interrupción descontados'],
      ['1', 'Sociales → Ciencias', '35 min descontados'],
    ])
  })
})
