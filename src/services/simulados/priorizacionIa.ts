/**
 * Datos simulados de RN-IA-002 (prioridades de atención con IA), solo con `VITE_DATOS_SIMULADOS=true`.
 *
 * - Un conjunto fijo de espacios (áreas y jardines) y ejemplares ficticios con su sustento (incidencias, última
 *   atención, frecuencia y estado sanitario). La puntuación y la prioridad salen del sustento, así que son
 *   coherentes: Alta con incidencias abiertas, frecuencia vencida o atención fitosanitaria especial; Baja si se
 *   atendió hace poco y sin incidencias.
 * - Un almacén en memoria con 3 propuestas (pendiente, validada y rechazada). Se pierde al recargar.
 * - Validar exige una decisión para cada elemento (400 con `errores_campo`); una propuesta ya resuelta da 409.
 *
 * Escenarios con `?simular=`:
 * - `vacio`: la bandeja vacía;
 * - `datos-insuficientes`: al solicitar, suficiencia insuficiente, con faltantes y parte del sustento a null;
 * - `ia-no-disponible`: al solicitar, 503;
 * - `error`, `sin-permiso` y `sin-sesion`: los genéricos de `simulacion.ts`.
 */
import { ErrorApi } from '../api/cliente'
import type { Paginado } from '../../types/comun'
import type { EstadoSugerencia } from '../../types/ia'
import type {
  ContenidoPriorizacion,
  CuerpoValidacionPriorizacion,
  ElementoPriorizado,
  PrioridadAtencion,
  SolicitudPriorizacion,
  SugerenciaPriorizacion,
  SustentoPrioridad,
} from '../../types/priorizacionIa'
import { hoyLima } from '../../utils/instanteLima'
import { crearAlmacenSimulado, errorConflicto, errorNoEncontrado, escenarioSimulado, responderSimulado } from './simulacion'

const POR_PAGINA = 25

interface Candidato {
  tipo: 'Area' | 'Ejemplar'
  registro_id: number
  nombre: string
  codigo: string | null
  area_verde_id: number
  espacio: string | null
  /** [incidencias abiertas, incidencias 12 meses, días desde la última atención, frecuencia, estado sanitario, atenciones 12 meses] */
  datos: [number, number, number, number, string, number]
}

const ESTABLE = 'Estable o sin afectación registrada'

const CANDIDATOS: Candidato[] = [
  { tipo: 'Area', registro_id: 11, nombre: 'Jardín Central', codigo: null, area_verde_id: 11, espacio: null, datos: [2, 5, 39, 30, ESTABLE, 10] },
  { tipo: 'Area', registro_id: 12, nombre: 'Tontódromo', codigo: null, area_verde_id: 12, espacio: null, datos: [0, 1, 12, 30, ESTABLE, 12] },
  { tipo: 'Area', registro_id: 13, nombre: 'Explanada de Ciencias', codigo: null, area_verde_id: 13, espacio: null, datos: [1, 3, 41, 30, ESTABLE, 9] },
  { tipo: 'Area', registro_id: 14, nombre: 'Plaza de Letras', codigo: null, area_verde_id: 14, espacio: null, datos: [0, 0, 6, 30, ESTABLE, 12] },
  { tipo: 'Area', registro_id: 15, nombre: 'Jardín de Ingeniería', codigo: null, area_verde_id: 15, espacio: null, datos: [0, 2, 27, 21, ESTABLE, 14] },
  { tipo: 'Area', registro_id: 16, nombre: 'Bosque de Ficus', codigo: null, area_verde_id: 16, espacio: null, datos: [1, 4, 52, 45, ESTABLE, 6] },
  { tipo: 'Ejemplar', registro_id: 123, nombre: 'Ficus', codigo: 'EJ-00123', area_verde_id: 16, espacio: 'Bosque de Ficus', datos: [1, 2, 70, 60, 'Atención fitosanitaria especial', 3] },
  { tipo: 'Ejemplar', registro_id: 205, nombre: 'Palmera real', codigo: 'EJ-00205', area_verde_id: 11, espacio: 'Jardín Central', datos: [0, 1, 95, 90, 'En tratamiento', 2] },
  { tipo: 'Ejemplar', registro_id: 318, nombre: 'Molle', codigo: 'EJ-00318', area_verde_id: 13, espacio: 'Explanada de Ciencias', datos: [0, 0, 40, 180, ESTABLE, 2] },
  { tipo: 'Ejemplar', registro_id: 341, nombre: 'Jacarandá', codigo: 'EJ-00341', area_verde_id: 12, espacio: 'Tontódromo', datos: [1, 1, 120, 90, 'Afectación detectada', 2] },
  { tipo: 'Ejemplar', registro_id: 402, nombre: 'Ficus', codigo: 'EJ-00402', area_verde_id: 15, espacio: 'Jardín de Ingeniería', datos: [0, 0, 20, 90, 'En seguimiento', 4] },
  { tipo: 'Ejemplar', registro_id: 455, nombre: 'Eucalipto', codigo: 'EJ-00455', area_verde_id: 14, espacio: 'Plaza de Letras', datos: [0, 0, 15, 180, ESTABLE, 2] },
]

const PESO_ESTADO: Record<string, number> = {
  'Atención fitosanitaria especial': 40,
  'En tratamiento': 30,
  'Afectación detectada': 25,
  'En seguimiento': 10,
}

function sustentoDe(c: Candidato): SustentoPrioridad {
  const [abiertas, anuales, desde, frecuencia, estado, atenciones] = c.datos
  return {
    incidencias_abiertas: abiertas,
    incidencias_ultimos_12_meses: anuales,
    dias_desde_ultima_atencion: desde,
    frecuencia_mantenimiento_dias: frecuencia,
    dias_vencida: desde - frecuencia,
    estado_sanitario: estado,
    atenciones_ultimos_12_meses: atenciones,
  }
}

function puntuar(s: SustentoPrioridad): number {
  const valor =
    (s.incidencias_abiertas ?? 0) * 20 +
    (s.incidencias_ultimos_12_meses ?? 0) * 3 +
    Math.max(0, s.dias_vencida ?? 0) * 2 +
    (PESO_ESTADO[s.estado_sanitario ?? ''] ?? 0)
  return Math.min(100, Math.max(5, valor))
}

const prioridadDe = (puntuacion: number): PrioridadAtencion => (puntuacion >= 50 ? 'Alta' : puntuacion >= 20 ? 'Media' : 'Baja')

function motivosDe(s: SustentoPrioridad, servicio: string): string[] {
  const motivos: string[] = []
  if (s.dias_vencida !== null && s.dias_vencida > 0) motivos.push(`La frecuencia de ${servicio} venció hace ${s.dias_vencida} días`)
  if (s.incidencias_abiertas) motivos.push(s.incidencias_abiertas === 1 ? '1 incidencia abierta' : `${s.incidencias_abiertas} incidencias abiertas`)
  if (s.estado_sanitario && s.estado_sanitario !== ESTABLE) motivos.push(`Estado sanitario: ${s.estado_sanitario.toLowerCase()}`)
  if (motivos.length === 0) motivos.push(`Atendido hace ${s.dias_desde_ultima_atencion ?? '?'} días y sin incidencias abiertas`)
  return motivos
}

const SERVICIOS: Record<number, string> = { 1: 'corte', 2: 'control fitosanitario', 3: 'poda', 5: 'mantenimiento' }

/** Elementos de una solicitud, ordenados por puntuación (exportado para las pruebas). */
export function elementosDe(solicitud: SolicitudPriorizacion, insuficiente = false): ElementoPriorizado[] {
  const servicio = SERVICIOS[solicitud.tipo_servicio_id ?? 0] ?? 'mantenimiento'
  return CANDIDATOS.filter(
    (c) =>
      (solicitud.alcance === 'Ambos' || (solicitud.alcance === 'Areas') === (c.tipo === 'Area')) &&
      (solicitud.area_verde_id === undefined || c.area_verde_id === solicitud.area_verde_id),
  )
    .map((c, i): ElementoPriorizado => {
      // Con datos insuficientes, a uno de cada tres le falta el historial y la frecuencia.
      const sinDatos = insuficiente && i % 3 === 0
      const completo = sustentoDe(c)
      const sustento: SustentoPrioridad = sinDatos
        ? { ...completo, dias_desde_ultima_atencion: null, frecuencia_mantenimiento_dias: null, dias_vencida: null, atenciones_ultimos_12_meses: null }
        : completo
      const puntuacion = puntuar(sustento)
      return {
        clave: `${c.tipo === 'Area' ? 'area' : 'ejemplar'}-${c.registro_id}`,
        tipo: c.tipo,
        registro_id: c.registro_id,
        nombre: c.nombre,
        codigo: c.codigo,
        espacio: c.espacio,
        prioridad_sugerida: prioridadDe(puntuacion),
        puntuacion,
        motivos: motivosDe(sustento, servicio),
        sustento,
        faltantes: sinDatos ? ['Historial de atenciones', 'Frecuencia de mantenimiento'] : [],
      }
    })
    .sort((a, b) => b.puntuacion - a.puntuacion || a.nombre.localeCompare(b.nombre, 'es'))
}

function contenidoDe(solicitud: SolicitudPriorizacion, insuficiente: boolean, ahora: string): ContenidoPriorizacion {
  const elementos = elementosDe(solicitud, insuficiente)
  return {
    version_contenido: 1,
    entrada: { ...solicitud, fecha_referencia: ahora.slice(0, 10), elementos_evaluados: elementos.length },
    ia: { proveedor: 'Simulado', modelo: 'demo-priorizacion', solicitado_en: ahora, duracion_ms: 4200 },
    suficiencia: insuficiente ? 'insuficiente' : 'suficiente',
    faltantes: insuficiente
      ? ['No hay historial de atenciones de 4 espacios', 'La frecuencia de mantenimiento no está configurada para Poda menor']
      : [],
    datos_utilizados: [
      'Historial de atenciones de los últimos 12 meses',
      'Incidencias abiertas y registradas en 12 meses',
      'Frecuencia de mantenimiento de cada servicio periódico',
      'Estado sanitario de los ejemplares',
    ],
    limitaciones: [
      'La propuesta no considera la disponibilidad de cuadrillas ni de proveedores',
      'Las incidencias sin espacio asignado no se tienen en cuenta',
    ],
    explicacion:
      'La puntuación suma las incidencias abiertas, los días de retraso frente a la frecuencia y la gravedad del estado sanitario. Alta desde 50 puntos; Media desde 20.',
    elementos,
    decision: null,
  }
}

function crearPropuesta(id: number, solicitud: SolicitudPriorizacion, ahora: string, insuficiente = false): SugerenciaPriorizacion {
  return {
    id,
    tipo: 'Priorizacion',
    entidad: 'AreaVerde',
    registro_id: solicitud.area_verde_id ?? 0,
    archivo_id: null,
    contenido: contenidoDe(solicitud, insuficiente, ahora),
    estado: 'Propuesta',
    etiqueta_estado: 'Pendiente de revisión',
    validador_id: null,
    fecha_validacion: null,
    fecha_creacion: ahora,
    usuario_creacion_id: 1,
    fecha_modificacion: ahora,
    usuario_modificacion_id: 1,
  }
}

function haceDias(dias: number, hora: string): string {
  const [anio, mes, dia] = hoyLima().split('-').map(Number)
  return `${new Date(Date.UTC(anio, mes - 1, dia - dias)).toISOString().slice(0, 10)}T${hora}:00-05:00`
}

function iniciales(): SugerenciaPriorizacion[] {
  const pendiente = crearPropuesta(1, { alcance: 'Ambos', horizonte_dias: 15 }, haceDias(1, '09:30'))
  const validada = crearPropuesta(2, { alcance: 'Areas', horizonte_dias: 7 }, haceDias(6, '11:15'))
  const elementosValidada = validada.contenido.elementos
  validada.estado = 'Validada'
  validada.etiqueta_estado = 'Validada'
  validada.validador_id = 1
  validada.fecha_validacion = haceDias(5, '16:40')
  validada.contenido.decision = {
    por_elemento: Object.fromEntries(
      elementosValidada.map((e, i) => [
        e.clave,
        i === 1 ? { accion: 'corregir', prioridad_final: 'Alta' } : i === elementosValidada.length - 1 ? { accion: 'descartar', prioridad_final: null } : { accion: 'aceptar', prioridad_final: e.prioridad_sugerida },
      ]),
    ),
    resumen: { aceptados: elementosValidada.length - 2, corregidos: 1, descartados: 1 },
    motivo_rechazo: null,
  }
  const rechazada = crearPropuesta(3, { alcance: 'Ejemplares', horizonte_dias: 30, tipo_servicio_id: 3 }, haceDias(12, '08:05'))
  rechazada.estado = 'Rechazada'
  rechazada.etiqueta_estado = 'Rechazada'
  rechazada.validador_id = 1
  rechazada.fecha_validacion = haceDias(11, '10:00')
  rechazada.contenido.decision = {
    por_elemento: {},
    resumen: { aceptados: 0, corregidos: 0, descartados: 0 },
    motivo_rechazo: 'La poda de altura ya está programada con el proveedor',
  }
  return [pendiente, validada, rechazada]
}

const almacen = crearAlmacenSimulado(iniciales())

/** `GET ia/priorizaciones/` simulado. */
export function simularListarPriorizaciones(filtros: { estado?: EstadoSugerencia; page?: number }, signal?: AbortSignal) {
  return responderSimulado<Paginado<SugerenciaPriorizacion>>(() => {
    const todas =
      escenarioSimulado() === 'vacio'
        ? []
        : almacen
            .listar()
            .filter((s) => !filtros.estado || s.estado === filtros.estado)
            .sort((a, b) => (b.fecha_creacion ?? '').localeCompare(a.fecha_creacion ?? ''))
    const pagina = Math.max(1, filtros.page ?? 1)
    return {
      count: todas.length,
      next: pagina * POR_PAGINA < todas.length ? `?page=${pagina + 1}` : null,
      previous: pagina > 1 ? `?page=${pagina - 1}` : null,
      results: todas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
    }
  }, { signal })
}

/** Crea la propuesta (exportado para las pruebas). */
export function solicitarSimulado(solicitud: SolicitudPriorizacion, ahora: Date = new Date()): SugerenciaPriorizacion {
  const propuesta = crearPropuesta(almacen.siguienteId(), solicitud, ahora.toISOString(), escenarioSimulado() === 'datos-insuficientes')
  return almacen.guardar(propuesta)
}

/** `POST ia/priorizaciones/` simulado (llamada de IA: admite `?simular=ia-no-disponible`). */
export function simularSolicitarPriorizacion(solicitud: SolicitudPriorizacion) {
  return responderSimulado(() => solicitarSimulado(solicitud), { esIa: true, demoraMs: 1500 })
}

function buscar(id: number): SugerenciaPriorizacion {
  const propuesta = almacen.obtener(id)
  if (!propuesta) throw errorNoEncontrado()
  return propuesta
}

/** `GET ia/priorizaciones/{id}/` simulado. */
export function simularObtenerPriorizacion(id: number, signal?: AbortSignal) {
  return responderSimulado(() => buscar(id), { signal })
}

/** Valida las decisiones (exportado para las pruebas). */
export function validarSimulado(id: number, cuerpo: CuerpoValidacionPriorizacion, ahora: Date = new Date()): SugerenciaPriorizacion {
  const propuesta = buscar(id)
  if (propuesta.estado !== 'Propuesta') throw errorConflicto('Esta propuesta ya fue revisada. Recarga la página para ver su estado.')
  const faltan = propuesta.contenido.elementos.filter((e) => {
    const d = cuerpo.por_elemento[e.clave]
    return !d || (d.accion === 'corregir' && !d.prioridad_final)
  })
  if (faltan.length > 0) {
    throw new ErrorApi(
      400,
      'decisiones-incompletas',
      `Falta la decisión de ${faltan.length} elementos`,
      Object.fromEntries(faltan.map((e) => [e.clave, ['Falta la decisión']])),
    )
  }
  const resumen = { aceptados: 0, corregidos: 0, descartados: 0 }
  const porElemento: NonNullable<ContenidoPriorizacion['decision']>['por_elemento'] = {}
  for (const e of propuesta.contenido.elementos) {
    const d = cuerpo.por_elemento[e.clave]
    if (d.accion === 'aceptar') resumen.aceptados += 1
    else if (d.accion === 'corregir') resumen.corregidos += 1
    else resumen.descartados += 1
    porElemento[e.clave] = {
      accion: d.accion,
      prioridad_final: d.accion === 'descartar' ? null : d.accion === 'corregir' ? (d.prioridad_final ?? null) : e.prioridad_sugerida,
    }
  }
  const instante = ahora.toISOString()
  return almacen.guardar({
    ...propuesta,
    estado: 'Validada',
    etiqueta_estado: 'Validada',
    validador_id: 1,
    fecha_validacion: instante,
    fecha_modificacion: instante,
    contenido: { ...propuesta.contenido, decision: { por_elemento: porElemento, resumen, motivo_rechazo: null } },
  })
}

/** `POST ia/priorizaciones/{id}/validar/` simulado. */
export function simularValidarPriorizacion(id: number, cuerpo: CuerpoValidacionPriorizacion) {
  return responderSimulado(() => validarSimulado(id, cuerpo))
}

/** Rechaza la propuesta completa (exportado para las pruebas). */
export function rechazarSimulado(id: number, motivo: string | null, ahora: Date = new Date()): SugerenciaPriorizacion {
  const propuesta = buscar(id)
  if (propuesta.estado !== 'Propuesta') throw errorConflicto('Esta propuesta ya fue revisada. Recarga la página para ver su estado.')
  const instante = ahora.toISOString()
  return almacen.guardar({
    ...propuesta,
    estado: 'Rechazada',
    etiqueta_estado: 'Rechazada',
    validador_id: 1,
    fecha_validacion: instante,
    fecha_modificacion: instante,
    contenido: {
      ...propuesta.contenido,
      decision: { por_elemento: {}, resumen: { aceptados: 0, corregidos: 0, descartados: 0 }, motivo_rechazo: motivo },
    },
  })
}

/** `POST ia/priorizaciones/{id}/rechazar/` simulado. */
export function simularRechazarPriorizacion(id: number, motivo: string | null) {
  return responderSimulado(() => rechazarSimulado(id, motivo))
}
