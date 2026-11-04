import { describe, expect, it } from 'vitest'
import type { Programacion, Restriccion } from '@/types/planificacion'
import { agendaSemana, diasDeSemana, distribuirSemana, etiquetaDia, eventosDeCapas, eventosDelDia, puntoDelDia, semanasDelMes, tituloDia, type EventoCapa } from './calendarioCapas'

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

describe('vista Lista', () => {
  it('deja las actividades del periodo por fecha de inicio, sin restricciones', async () => {
    const { actividadesDelPeriodo } = await import('./calendarioCapas')
    const eventos = eventosDeCapas(
      [restriccion({})],
      [
        programacion({ id: 1, fecha_inicio_prevista: '2026-11-16', fecha_fin_prevista: '2026-11-19' }),
        programacion({ id: 2, fecha_inicio_prevista: '2026-11-02', fecha_fin_prevista: '2026-11-02' }),
        programacion({ id: 3, fecha_inicio_prevista: '2026-12-02', fecha_fin_prevista: '2026-12-02' }),
      ],
    )
    expect(actividadesDelPeriodo('2026-11-01', '2026-11-30', eventos).map((e) => e.clave)).toEqual(['p-2', 'p-1'])
  })
})

describe('filtros del calendario', () => {
  it('filtra actividades por tipo y proveedor, deja las restricciones y ofrece «Personal propio»', async () => {
    const { chipsFiltros, filtrarEventos, opcionesProveedor, PERSONAL_PROPIO } = await import('./calendarioCapas')
    const eventos = eventosDeCapas(
      [restriccion({})],
      [
        programacion({ id: 1, tipo_servicio_id: 1, proveedor_id: 5, proveedor: 'Podas Altura Demo' }),
        programacion({ id: 2, tipo_servicio_id: 2, proveedor_id: null }),
      ],
    )
    expect(filtrarEventos(eventos, { tipos: ['2'], proveedor: '' }).map((e) => e.clave)).toEqual(['r-1', 'p-2'])
    expect(filtrarEventos(eventos, { tipos: [], proveedor: PERSONAL_PROPIO }).map((e) => e.clave)).toEqual(['r-1', 'p-2'])
    expect(filtrarEventos(eventos, { tipos: [], proveedor: '5' }).map((e) => e.clave)).toEqual(['r-1', 'p-1'])
    const proveedores = opcionesProveedor(eventos)
    expect(proveedores.map((p) => p.texto)).toEqual(['Personal propio', 'Podas Altura Demo'])
    expect(chipsFiltros({ tipos: ['1'], proveedor: '5' }, [{ valor: '1', texto: 'Corte de césped' }], proveedores).map((c) => c.texto)).toEqual([
      'Tipo: Corte de césped',
      'Proveedor: Podas Altura Demo',
    ])
  })
})

describe('vista móvil (Figma 352-2192)', () => {
  const eventos = eventosDeCapas(
    [
      restriccion({ id: 1, efecto: 'Advertencia', tipo: 'Feria', fecha_inicio: '2026-11-10', fecha_fin: '2026-11-10' }),
      restriccion({ id: 2, efecto: 'Prohibicion', tipo: 'Examen', fecha_inicio: '2026-11-15', fecha_fin: '2026-11-15' }),
      restriccion({ id: 3, efecto: 'Advertencia', tipo: 'Clases', fecha_inicio: '2026-11-15', fecha_fin: '2026-11-15' }),
    ],
    [programacion({ id: 9, servicio: 'Poda', fecha_inicio_prevista: '2026-11-09', fecha_fin_prevista: '2026-11-09' })],
  )

  it('pone bajo cada día el punto del evento más fuerte', () => {
    expect(diasDeSemana('2026-11-12').map((dia) => puntoDelDia(dia, eventos))).toEqual(['actividad', 'aviso', null, null, null, null, 'prohibicion'])
  })

  it('agrupa la agenda por día, solo con los días que tienen eventos', () => {
    expect(agendaSemana(diasDeSemana('2026-11-12'), eventos).map((d) => [d.texto, d.eventos.map((e) => e.texto)])).toEqual([
      ['Lun 9', ['Poda']],
      ['Mar 10', ['Feria']],
      ['Dom 15', ['Examen', 'Clases']],
    ])
  })
})
