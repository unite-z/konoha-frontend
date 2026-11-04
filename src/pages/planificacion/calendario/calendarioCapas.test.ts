import { describe, expect, it } from 'vitest'
import type { Programacion, Restriccion } from '@/types/planificacion'
import { distribuirSemana, etiquetaDia, eventosDeCapas, eventosDelDia, semanasDelMes, tituloDia, type EventoCapa } from './calendarioCapas'

function restriccion(parcial: Partial<Restriccion>): Restriccion {
  return {
    id: 1,
    tipo_restriccion_id: 1,
    tipo: 'Cultural',
    efecto: 'Advertencia',
    aplica_servicios_ruidosos: true,
    fecha_inicio: '2026-11-05',
    fecha_fin: '2026-11-05',
    hora_inicio: null,
    hora_fin: null,
    area_verde_id: null,
    descripcion: null,
    serie: null,
    ...parcial,
  }
}

function programacion(parcial: Partial<Programacion>): Programacion {
  return {
    id: 1,
    tipo_servicio_id: 1,
    servicio: 'Corte de césped',
    proveedor_id: null,
    proveedor: null,
    estacion: 'Primavera',
    fecha_inicio_prevista: '2026-11-16',
    fecha_fin_prevista: '2026-11-19',
    estado: 'Programada',
    fecha_inicio_real: null,
    fecha_fin_real: null,
    ...parcial,
  }
}

const SEMANA_16 = ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22']

describe('semanasDelMes', () => {
  it('cubre el mes de lunes a domingo', () => {
    const semanas = semanasDelMes({ anio: 2026, mes: 11 })
    expect(semanas).toHaveLength(6)
    expect(semanas[0][0]).toBe('2026-10-26')
    expect(semanas[5][6]).toBe('2026-12-06')
    expect(semanasDelMes({ anio: 2027, mes: 2 })).toHaveLength(4)
  })
})

describe('eventosDeCapas', () => {
  it('convierte restricciones y actividades, sin las canceladas y con las fechas reales si las hay', () => {
    const eventos = eventosDeCapas(
      [restriccion({ efecto: 'Prohibicion', tipo: 'Examen' })],
      [
        programacion({ id: 2, estado: 'EnCurso', fecha_inicio_real: '2026-11-17' }),
        programacion({ id: 3, estado: 'Cancelada' }),
      ],
    )
    expect(eventos.map((e) => [e.clave, e.tipo, e.texto, e.inicio, e.fin])).toEqual([
      ['r-1', 'prohibicion', 'Examen', '2026-11-05', '2026-11-05'],
      ['p-2', 'enCurso', 'Corte de césped', '2026-11-17', '2026-11-19'],
    ])
  })
})

describe('distribuirSemana', () => {
  it('pinta un evento de varios días como una sola barra y pone primero las restricciones', () => {
    const eventos = eventosDeCapas(
      [restriccion({ id: 9, fecha_inicio: '2026-11-19', fecha_fin: '2026-11-19' })],
      [programacion({ id: 1 })],
    )
    const semana = distribuirSemana(SEMANA_16, eventos)
    expect(semana.segmentos.map((s) => [s.evento.clave, s.columna, s.dias, s.carril])).toEqual([
      ['r-9', 4, 1, 0],
      ['p-1', 1, 4, 1],
    ])
  })

  it('recorta la barra a la semana y marca que sigue antes y después', () => {
    const eventos = eventosDeCapas([restriccion({ fecha_inicio: '2026-11-12', fecha_fin: '2026-11-25' })], [])
    const [segmento] = distribuirSemana(SEMANA_16, eventos).segmentos
    expect([segmento.columna, segmento.dias, segmento.sigueAntes, segmento.sigueDespues]).toEqual([1, 7, true, true])
  })

  it('cuenta lo que no cabe en cada día para el «+N más»', () => {
    const eventos: EventoCapa[] = eventosDeCapas(
      [],
      [1, 2, 3, 4, 5].map((id) => programacion({ id, servicio: `S${id}`, fecha_inicio_prevista: '2026-11-18', fecha_fin_prevista: '2026-11-18' })),
    )
    const semana = distribuirSemana(SEMANA_16, eventos)
    expect(semana.segmentos).toHaveLength(3)
    expect(semana.ocultos).toEqual([0, 0, 2, 0, 0, 0, 0])
  })
})

describe('agenda del día', () => {
  it('separa restricciones y actividades del día y las nombra para lectores de pantalla', () => {
    const eventos = eventosDeCapas([restriccion({ fecha_inicio: '2026-11-19', fecha_fin: '2026-11-19' })], [programacion({})])
    const { restricciones, actividades } = eventosDelDia('2026-11-19', eventos)
    expect([restricciones.length, actividades.length]).toEqual([1, 1])
    expect(tituloDia('2026-11-12')).toBe('Jueves 12')
    expect(etiquetaDia('2026-11-19', eventos)).toBe('jueves 19, 1 restricción, 1 actividad')
    expect(etiquetaDia('2026-11-20', eventos)).toBe('viernes 20')
  })
})

describe('vista Semana', () => {
  it('da los días y el título de la semana, también si cruza de mes', async () => {
    const { diasDeSemana, tituloSemana } = await import('./calendarioCapas')
    expect(diasDeSemana('2026-11-19')).toEqual(SEMANA_16)
    expect(tituloSemana(SEMANA_16)).toBe('16 al 22 nov. 2026')
    expect(tituloSemana(diasDeSemana('2026-12-02'))).toBe('30 nov. al 6 dic. 2026')
  })

  it('separa la fila de todo el día de las actividades de un día y busca las coincidencias', async () => {
    const { actividadesDeUnDia, coincidencias, filaTodoElDia } = await import('./calendarioCapas')
    const eventos = eventosDeCapas(
      [restriccion({ id: 9, fecha_inicio: '2026-11-19', fecha_fin: '2026-11-19' })],
      [programacion({ id: 1 }), programacion({ id: 2, fecha_inicio_prevista: '2026-11-18', fecha_fin_prevista: '2026-11-18' })],
    )
    expect(filaTodoElDia(SEMANA_16, eventos).segmentos.map((s) => s.evento.clave)).toEqual(['r-9', 'p-1'])
    expect(actividadesDeUnDia('2026-11-18', eventos).map((e) => e.clave)).toEqual(['p-2'])
    const corte = eventos.find((e) => e.clave === 'p-1')
    expect(corte && coincidencias(corte, eventos).map((e) => e.clave)).toEqual(['r-9'])
  })
})
