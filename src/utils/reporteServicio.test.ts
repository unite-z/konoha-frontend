import { describe, expect, it } from 'vitest'
import type {
  AvanceServicio,
  ConformidadServicio,
  FilaAtencionServicio,
  RendimientoServicio,
} from '../types/reportesGestion'
import {
  atencionesDeConformidad,
  atencionesDeElemento,
  atencionesDeParte,
  claveConsultaServicio,
  consultaServicio,
  contextoRendimiento,
  filtrarSinEvidencia,
  mesEnCursoHastaHoy,
  metradoAvance,
  resumenConformidad,
  textoAvance,
  tituloTarjetaRendimiento,
} from './reporteServicio'

const conDatos = { sin_datos: false, mensaje_sin_datos: null }
const sinDatos = { sin_datos: true, mensaje_sin_datos: 'Motivo' }

const avance: AvanceServicio = {
  ...conDatos,
  programadas: 8,
  extraordinarias: 2,
  ejecutadas: 6,
  en_ejecucion: 1,
  pendientes: 3,
  porcentaje_avance: '60',
  metrado_previsto: '1000',
  metrado_ejecutado: '600.5',
  unidad_metrado: 'm²',
}

function fila(cambios: Partial<FilaAtencionServicio>): FilaAtencionServicio {
  return {
    id: 1,
    codigo: 'AT-1',
    clase: 'Programada',
    estado: 'Reporte adjunto',
    etiqueta_estado: 'Reporte adjunto',
    espacio: 'Jardín Central',
    ejemplar_codigo: null,
    fecha_hora_inicio: null,
    fecha_hora_fin: null,
    metrado: '10',
    unidad: 'm²',
    conformidad: null,
    documentos: 1,
    especies_plagas: [],
    con_evidencia: true,
    es_riesgo: false,
    ...cambios,
  }
}

describe('mesEnCursoHastaHoy', () => {
  it('va del día 1 del mes a hoy en Lima', () => {
    // 1 de noviembre a las 03:00 UTC: en Lima aún es 31 de octubre.
    expect(mesEnCursoHastaHoy(new Date('2026-11-01T03:00:00Z'))).toEqual({ desde: '2026-10-01', hasta: '2026-10-31' })
    expect(mesEnCursoHastaHoy(new Date('2026-11-15T15:00:00Z'))).toEqual({ desde: '2026-11-01', hasta: '2026-11-15' })
  })
})

describe('consultaServicio', () => {
  const base = { desde: '2026-10-01', hasta: '2026-10-31', tipo_servicio_id: '', proveedor_id: '' }

  it('sin servicio elegido no hay consulta ni clave', () => {
    expect(consultaServicio(base)).toBeNull()
    expect(consultaServicio({ ...base, tipo_servicio_id: 'abc' })).toBeNull()
    expect(claveConsultaServicio(null)).toBeNull()
  })

  it('convierte los ids y omite el proveedor vacío', () => {
    const consulta = consultaServicio({ ...base, tipo_servicio_id: '2' })
    expect(consulta).toEqual({ desde: '2026-10-01', hasta: '2026-10-31', tipo_servicio_id: 2, proveedor_id: undefined })
    expect(claveConsultaServicio(consultaServicio({ ...base, tipo_servicio_id: '2', proveedor_id: '101' }))).toBe(
      'servicio|2|101|2026-10-01|2026-10-31',
    )
  })
})

describe('textos de las tarjetas', () => {
  it('textoAvance cuenta las ejecutadas sobre el total, o null sin datos', () => {
    expect(textoAvance(avance)).toBe('6 de 10 atenciones')
    expect(textoAvance({ ...avance, programadas: 1, extraordinarias: 0, ejecutadas: 1 })).toBe('1 de 1 atención')
    expect(textoAvance({ ...avance, ...sinDatos })).toBeNull()
  })

  it('resumenConformidad usa singular y plural, o null sin datos', () => {
    const conformidad: ConformidadServicio = {
      ...conDatos,
      conformes: 1,
      observadas: 3,
      pendientes_de_revision: 0,
      sin_reporte_proveedor: 0,
      subsanaciones_abiertas: 0,
    }
    expect(resumenConformidad(conformidad)).toBe('1 conforme · 3 observadas')
    expect(resumenConformidad({ ...conformidad, ...sinDatos })).toBeNull()
  })

  it('tituloTarjetaRendimiento muestra la unidad o «Sin datos», nunca un cero inventado', () => {
    const rendimiento: RendimientoServicio = {
      ...conDatos,
      horas_ejecucion: '20',
      rendimiento_por_hora: '512.5',
      unidad_rendimiento: 'm²/h',
      duracion_media_horas: '5',
      atenciones_fuera_de_plazo: 0,
    }
    expect(tituloTarjetaRendimiento(rendimiento)).toBe('512,5 m²/h')
    expect(tituloTarjetaRendimiento({ ...rendimiento, ...sinDatos })).toBe('Sin datos')
    expect(tituloTarjetaRendimiento({ ...rendimiento, rendimiento_por_hora: null })).toBe('Sin datos')
  })

  it('contextoRendimiento añade las fuera de plazo solo si alguna atención tiene plazo', () => {
    const rendimiento: RendimientoServicio = {
      ...conDatos,
      horas_ejecucion: '20',
      rendimiento_por_hora: '512.5',
      unidad_rendimiento: 'm²/h',
      duracion_media_horas: '5',
      atenciones_fuera_de_plazo: 2,
    }
    expect(contextoRendimiento(rendimiento)).toBe('En 20 h de ejecución · 2 fuera de plazo')
    expect(contextoRendimiento({ ...rendimiento, atenciones_fuera_de_plazo: 0 })).toBe(
      'En 20 h de ejecución · 0 fuera de plazo',
    )
    // Sin plazo (null) no se inventa un cero.
    expect(contextoRendimiento({ ...rendimiento, atenciones_fuera_de_plazo: null })).toBe('En 20 h de ejecución')
    expect(contextoRendimiento({ ...rendimiento, horas_ejecucion: null, atenciones_fuera_de_plazo: null })).toBeNull()
  })
})

describe('registros de origen', () => {
  const filas = [
    fila({ id: 1, con_evidencia: false, especies_plagas: ['Queresa'] }),
    fila({ id: 2, clase: 'Extraordinaria', estado: 'En ejecución', especies_plagas: ['Queresa', 'Pulgón'] }),
    fila({ id: 3, estado: 'OC referenciada' }),
  ]
  const ids = (lista: FilaAtencionServicio[]) => lista.map((f) => f.id)

  it('filtrarSinEvidencia deja solo las atenciones sin documentos cuando se pide', () => {
    expect(ids(filtrarSinEvidencia(filas, true))).toEqual([1])
    expect(filtrarSinEvidencia(filas, false)).toBe(filas)
  })

  it('atencionesDeParte separa por clase y por situación', () => {
    expect(ids(atencionesDeParte(filas, 'programadas'))).toEqual([1, 3])
    expect(ids(atencionesDeParte(filas, 'extraordinarias'))).toEqual([2])
    expect(ids(atencionesDeParte(filas, 'ejecutadas'))).toEqual([1])
    expect(ids(atencionesDeParte(filas, 'en_ejecucion'))).toEqual([2])
    expect(ids(atencionesDeParte(filas, 'pendientes'))).toEqual([3])
  })

  it('atencionesDeConformidad usa la conformidad y el estado', () => {
    const conConformidad = [
      fila({ id: 7, estado: 'Conforme / cerrado', conformidad: 'Conforme' }),
      fila({ id: 8, estado: 'Observado', conformidad: 'Observada' }),
      fila({ id: 9, estado: 'Ejecutado pendiente de reporte' }),
      ...filas,
    ]
    expect(ids(atencionesDeConformidad(conConformidad, 'conformes'))).toEqual([7])
    expect(ids(atencionesDeConformidad(conConformidad, 'observadas'))).toEqual([8])
    expect(ids(atencionesDeConformidad(conConformidad, 'subsanaciones_abiertas'))).toEqual([8])
    expect(ids(atencionesDeConformidad(conConformidad, 'sin_reporte_proveedor'))).toEqual([9])
    expect(ids(atencionesDeConformidad(conConformidad, 'pendientes_de_revision'))).toEqual([1])
  })

  it('atencionesDeElemento busca la especie o plaga', () => {
    expect(ids(atencionesDeElemento(filas, 'Queresa'))).toEqual([1, 2])
    expect(ids(atencionesDeElemento(filas, 'Pulgón'))).toEqual([2])
  })
})

describe('metradoAvance', () => {
  it('devuelve ejecutado y previsto, o null si falta alguno', () => {
    expect(metradoAvance(avance)).toEqual({ ejecutado: 600.5, previsto: 1000, unidad: 'm²' })
    expect(metradoAvance({ ...avance, metrado_previsto: null })).toBeNull()
    expect(metradoAvance({ ...avance, ...sinDatos })).toBeNull()
  })
})
