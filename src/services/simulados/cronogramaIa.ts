/**
 * Datos simulados de RF-IA-003 (planificación asistida del cronograma), solo con `VITE_DATOS_SIMULADOS=true`.
 *
 * - Cada propuesta se genera para el periodo pedido con 14 actividades ficticias: corte de césped (Verde Campus,
 *   ciclos de 3 días), mantenimiento de jardines (Cuadrilla 1, 4 operarios), control fitosanitario (Arbolistas del
 *   Sur) y una poda mayor. Dos coinciden con restricciones: una advertencia y una prohibición (RI-25).
 * - Un almacén en memoria con 3 propuestas: pendiente (mes en curso), confirmada y rechazada (mes anterior).
 * - Confirmar exige una decisión por propuesta y la confirmación expresa de las prohibiciones (422
 *   `restriccion-sin-confirmar`); solo crea programaciones (ids ficticios) para las aceptadas y modificadas.
 *
 * Escenarios con `?simular=`:
 * - `vacio`: al generar, sin actividades pendientes;
 * - `datos-insuficientes`: al generar, propuesta parcial de 6 actividades con faltantes;
 * - `ia-no-disponible`: al generar, 503;
 * - `error`, `sin-permiso` y `sin-sesion`: los genéricos de `simulacion.ts`.
 */
import { ErrorApi } from '../api/cliente'
import type { Paginado } from '../../types/comun'
import type {
  ContenidoCronograma,
  CuerpoValidacionCronograma,
  DecisionCronograma,
  ProgramacionExistente,
  PropuestaCronograma,
  RecursosSugeridos,
  RestriccionConsiderada,
  SolicitudCronograma,
  SugerenciaCronograma,
} from '../../types/cronogramaIa'
import type { EstadoSugerencia } from '../../types/ia'
import { coincideConProhibicion, enIntervalo, sumarDias } from '../../utils/cronogramaIa'
import { hoyLima } from '../../utils/instanteLima'
import { crearAlmacenSimulado, errorConflicto, errorNoEncontrado, escenarioSimulado, responderSimulado } from './simulacion'

const POR_PAGINA = 25

const VERDE_CAMPUS: RecursosSugeridos = { modalidad: 'Tercerizado', cuadrilla_id: null, cuadrilla: null, proveedor_id: 101, proveedor: 'Verde Campus S.A.C. (demo)', operarios: null }
const ARBOLISTAS: RecursosSugeridos = { modalidad: 'Tercerizado', cuadrilla_id: null, cuadrilla: null, proveedor_id: 102, proveedor: 'Arbolistas del Sur E.I.R.L. (demo)', operarios: null }
const CUADRILLA_1: RecursosSugeridos = { modalidad: 'PersonalPropio', cuadrilla_id: 1, cuadrilla: 'Cuadrilla 1 (demo)', proveedor_id: null, proveedor: null, operarios: 4 }
const CUADRILLA_2: RecursosSugeridos = { modalidad: 'PersonalPropio', cuadrilla_id: 2, cuadrilla: 'Cuadrilla 2 (demo)', proveedor_id: null, proveedor: null, operarios: 3 }

/** [actividad, servicio, espacio, ubicación, día del periodo (desde 0), días, recursos, motivo] */
type Plantilla = [string, number, number, string, number, number, RecursosSugeridos, string]

const PLANTILLAS: Plantilla[] = [
  ['Corte de césped y limpieza', 1, 11, 'Jardín Central', 1, 3, VERDE_CAMPUS, 'Frecuencia de corte: 30 días desde la última intervención (hace 32 días)'],
  ['Mantenimiento de jardines', 5, 14, 'Plaza de Letras', 2, 1, CUADRILLA_1, 'Riego y deshierbe semanales'],
  ['Control fitosanitario', 2, 16, 'Bosque de Ficus', 3, 1, ARBOLISTAS, 'Prioridad alta en la última priorización: atención fitosanitaria especial'],
  ['Corte de césped y limpieza', 1, 12, 'Tontódromo', 7, 3, VERDE_CAMPUS, 'Frecuencia de corte: 30 días desde la última intervención (hace 27 días)'],
  ['Mantenimiento de jardines', 5, 15, 'Jardín de Ingeniería', 8, 1, CUADRILLA_2, 'Riego y deshierbe semanales'],
  ['Poda mayor programada', 3, 11, 'Jardín Central', 10, 2, ARBOLISTAS, 'Ficus con ramas sobre el paso peatonal (incidencia abierta)'],
  ['Mantenimiento de jardines', 5, 11, 'Jardín Central', 13, 1, CUADRILLA_1, 'Riego y deshierbe semanales'],
  ['Corte de césped y limpieza', 1, 14, 'Plaza de Letras', 14, 3, VERDE_CAMPUS, 'Frecuencia de corte: 30 días desde la última intervención (hace 30 días)'],
  ['Control fitosanitario', 2, 11, 'Jardín Central', 16, 1, ARBOLISTAS, 'Seguimiento del tratamiento contra queresa'],
  ['Mantenimiento de jardines', 5, 12, 'Tontódromo', 17, 1, CUADRILLA_2, 'Riego y deshierbe semanales'],
  ['Corte de césped y limpieza', 1, 15, 'Jardín de Ingeniería', 20, 3, VERDE_CAMPUS, 'Frecuencia de corte: 30 días desde la última intervención (hace 25 días)'],
  ['Corte de césped y limpieza', 1, 13, 'Explanada de Ciencias', 23, 3, VERDE_CAMPUS, 'Frecuencia de corte: 30 días desde la última intervención (hace 29 días)'],
  ['Mantenimiento de jardines', 5, 13, 'Explanada de Ciencias', 24, 1, CUADRILLA_1, 'Riego y deshierbe semanales'],
  ['Control fitosanitario', 2, 12, 'Tontódromo', 27, 1, ARBOLISTAS, 'Revisión trimestral de plagas'],
]

/** Restricciones del periodo (del calendario de Planificación), en días desde el inicio del periodo. */
function restriccionesDe(desde: string): RestriccionConsiderada[] {
  return [
    { fecha_inicio: sumarDias(desde, 13), fecha_fin: sumarDias(desde, 13), tipo: 'Advertencia', descripcion: 'Reserva del Jardín Central para un evento', espacio: 'Jardín Central' },
    { fecha_inicio: sumarDias(desde, 22), fecha_fin: sumarDias(desde, 34), tipo: 'Prohibicion', descripcion: 'Evaluaciones finales: prohibición de ruido', espacio: 'Explanada de Ciencias' },
    { fecha_inicio: sumarDias(desde, 37), fecha_fin: sumarDias(desde, 37), tipo: 'Prohibicion', descripcion: 'Feriado', espacio: null },
  ]
}

function coincidencias(p: Pick<PropuestaCronograma, 'fecha_inicio' | 'fecha_fin' | 'ubicacion'>, restricciones: RestriccionConsiderada[]) {
  return restricciones.filter(
    (r) => r.fecha_inicio <= p.fecha_fin && r.fecha_fin >= p.fecha_inicio && (r.espacio === null || r.espacio === p.ubicacion),
  )
}

/** Propuestas de un periodo (exportado para las pruebas). */
export function propuestasDe(solicitud: SolicitudCronograma, parcial = false): PropuestaCronograma[] {
  const restricciones = restriccionesDe(solicitud.desde)
  return PLANTILLAS.map(([actividad, servicio, areaId, ubicacion, dia, dias, recursos, motivo], i): PropuestaCronograma => {
    const fecha_inicio = sumarDias(solicitud.desde, dia)
    const fecha_fin = sumarDias(fecha_inicio, dias - 1)
    return {
      clave: `p-${i + 1}`,
      tipo_servicio_id: servicio,
      actividad,
      area_verde_id: areaId,
      ubicacion,
      fecha_inicio,
      fecha_fin,
      recursos,
      motivo,
      coincidencias: coincidencias({ fecha_inicio, fecha_fin, ubicacion }, restricciones),
    }
  })
    .filter(
      (p) =>
        enIntervalo(p.fecha_inicio, solicitud.desde, solicitud.hasta) &&
        (!solicitud.modalidad || p.recursos.modalidad === solicitud.modalidad) &&
        (!solicitud.tipo_servicio_ids?.length || solicitud.tipo_servicio_ids.includes(p.tipo_servicio_id)),
    )
    .slice(0, parcial ? 6 : undefined)
}

function contenidoDe(solicitud: SolicitudCronograma, ahora: string): ContenidoCronograma {
  const escenario = escenarioSimulado()
  const parcial = escenario === 'datos-insuficientes'
  const propuestas = escenario === 'vacio' ? [] : propuestasDe(solicitud, parcial)
  return {
    version_contenido: 1,
    ia: { proveedor: 'Simulado', modelo: 'demo-cronograma', solicitado_en: ahora, duracion_ms: 5200 },
    suficiencia: parcial ? 'parcial' : 'suficiente',
    faltantes: parcial ? ['Frecuencia no configurada para Poda menor', 'Sin disponibilidad registrada de la Cuadrilla 2'] : [],
    datos_utilizados: [
      'Servicios periódicos y sus frecuencias',
      'Última intervención de cada espacio',
      'Calendario de restricciones del periodo',
      'Disponibilidad de las cuadrillas',
      'Prioridades validadas de la última priorización',
    ],
    limitaciones: ['No considera la disponibilidad real de los proveedores', 'Las fechas son sugerencias: revísalas antes de confirmar'],
    explicacion:
      propuestas.length === 0
        ? 'No hay actividades pendientes en el periodo'
        : 'Se reparten las actividades vencidas o próximas a vencer en días laborables, evitando las prohibiciones del calendario.',
    entrada: { ...solicitud, actividades_pendientes: propuestas.length },
    criterios: [
      'Frecuencia de corte: 30 días desde la última intervención',
      'Disponibilidad de cuadrillas de lunes a viernes',
      'Se evitan prohibiciones de calendario',
      'Prioridades validadas de la última priorización',
    ],
    restricciones: restriccionesDe(solicitud.desde).filter((r) => r.fecha_inicio <= solicitud.hasta && r.fecha_fin >= solicitud.desde),
    propuestas,
    decision: null,
  }
}

function crear(id: number, solicitud: SolicitudCronograma, ahora: string): SugerenciaCronograma {
  return {
    id,
    tipo: 'Cronograma',
    entidad: 'ProgramacionServicio',
    registro_id: 0,
    archivo_id: null,
    contenido: contenidoDe(solicitud, ahora),
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

function mesCompleto(desplazamiento: number): SolicitudCronograma {
  const [anio, mes] = hoyLima().split('-').map(Number)
  const desde = new Date(Date.UTC(anio, mes - 1 + desplazamiento, 1)).toISOString().slice(0, 10)
  const hasta = new Date(Date.UTC(anio, mes + desplazamiento, 0)).toISOString().slice(0, 10)
  return { desde, hasta }
}

function resumir(propuestas: PropuestaCronograma[], porPropuesta: DecisionCronograma['por_propuesta'], motivo: string | null, base: number): DecisionCronograma {
  const resumen = { aceptados: 0, corregidos: 0, descartados: 0 }
  const creadas: number[] = []
  propuestas.forEach((p, i) => {
    const accion = porPropuesta[p.clave]?.accion
    if (accion === 'aceptar') resumen.aceptados += 1
    else if (accion === 'corregir') resumen.corregidos += 1
    else if (accion === 'descartar') resumen.descartados += 1
    if (accion === 'aceptar' || accion === 'corregir') creadas.push(base + i)
  })
  return { por_propuesta: porPropuesta, resumen, programaciones_creadas: creadas, motivo_rechazo: motivo }
}

function iniciales(): SugerenciaCronograma[] {
  const hoy = hoyLima()
  const pendiente = crear(1, mesCompleto(0), `${hoy}T08:30:00-05:00`)
  const confirmada = crear(2, mesCompleto(-1), `${mesCompleto(-1).desde}T09:00:00-05:00`)
  const propuestas = confirmada.contenido.propuestas
  const porPropuesta: DecisionCronograma['por_propuesta'] = Object.fromEntries(
    propuestas.map((p, i) => [
      p.clave,
      i === 2
        ? { accion: 'corregir', valores_finales: { fecha_inicio: sumarDias(p.fecha_inicio, 2), fecha_fin: sumarDias(p.fecha_fin, 2), area_verde_id: p.area_verde_id, cuadrilla_id: p.recursos.cuadrilla_id, proveedor_id: p.recursos.proveedor_id, operarios: p.recursos.operarios }, confirma_restriccion: false }
        : coincideConProhibicion(p) || i === 5
          ? { accion: 'descartar', valores_finales: null, confirma_restriccion: false }
          : { accion: 'aceptar', valores_finales: null, confirma_restriccion: false },
    ]),
  )
  Object.assign(confirmada, { estado: 'Validada', etiqueta_estado: 'Validada', validador_id: 1, fecha_validacion: `${mesCompleto(-1).desde}T16:10:00-05:00` })
  confirmada.contenido.decision = resumir(propuestas, porPropuesta, null, 8100)
  const rechazada = crear(3, { ...mesCompleto(-1), modalidad: 'Tercerizado' }, `${mesCompleto(-1).desde}T08:00:00-05:00`)
  Object.assign(rechazada, { estado: 'Rechazada', etiqueta_estado: 'Rechazada', validador_id: 1, fecha_validacion: `${mesCompleto(-1).desde}T08:45:00-05:00` })
  rechazada.contenido.decision = { por_propuesta: {}, resumen: { aceptados: 0, corregidos: 0, descartados: 0 }, programaciones_creadas: [], motivo_rechazo: 'Se planificó de forma manual con los proveedores' }
  return [pendiente, confirmada, rechazada]
}

const almacen = crearAlmacenSimulado(iniciales())

/** `GET ia/cronogramas/` simulado. */
export function simularListarCronogramas(filtros: { estado?: EstadoSugerencia; page?: number }, signal?: AbortSignal) {
  return responderSimulado<Paginado<SugerenciaCronograma>>(() => {
    const todas =
      escenarioSimulado() === 'vacio'
        ? []
        : almacen
            .listar()
            .filter((s) => !filtros.estado || s.estado === filtros.estado)
            .sort((a, b) => (b.fecha_creacion ?? '').localeCompare(a.fecha_creacion ?? '') || b.id - a.id)
    const pagina = Math.max(1, filtros.page ?? 1)
    return {
      count: todas.length,
      next: pagina * POR_PAGINA < todas.length ? `?page=${pagina + 1}` : null,
      previous: pagina > 1 ? `?page=${pagina - 1}` : null,
      results: todas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
    }
  }, { signal })
}

/** Genera la propuesta (exportado para las pruebas). */
export function solicitarSimulado(solicitud: SolicitudCronograma, ahora: Date = new Date()): SugerenciaCronograma {
  return almacen.guardar(crear(almacen.siguienteId(), solicitud, ahora.toISOString()))
}

/** `POST ia/cronogramas/` simulado (llamada de IA: admite `?simular=ia-no-disponible`). */
export function simularSolicitarCronograma(solicitud: SolicitudCronograma) {
  return responderSimulado(() => solicitarSimulado(solicitud), { esIa: true, demoraMs: 1800 })
}

function buscar(id: number): SugerenciaCronograma {
  const s = almacen.obtener(id)
  if (!s) throw errorNoEncontrado()
  return s
}

/** `GET ia/cronogramas/{id}/` simulado. */
export function simularObtenerCronograma(id: number, signal?: AbortSignal) {
  return responderSimulado(() => buscar(id), { signal })
}

const YA_REVISADA = 'Esta propuesta ya fue revisada. Recarga la página para ver su estado.'

/** Confirma las decisiones (exportado para las pruebas). */
export function confirmarSimulado(id: number, cuerpo: CuerpoValidacionCronograma, ahora: Date = new Date()): SugerenciaCronograma {
  const s = buscar(id)
  if (s.estado !== 'Propuesta') throw errorConflicto(YA_REVISADA)
  const { propuestas } = s.contenido
  const faltan = propuestas.filter((p) => !cuerpo.por_propuesta[p.clave])
  if (faltan.length > 0) {
    throw new ErrorApi(400, 'decisiones-incompletas', `Falta la decisión de ${faltan.length} propuestas`, Object.fromEntries(faltan.map((p) => [p.clave, ['Falta la decisión']])))
  }
  const sinConfirmar = propuestas.filter((p) => {
    const d = cuerpo.por_propuesta[p.clave]
    return d.accion !== 'descartar' && coincideConProhibicion(p) && !d.confirma_restriccion
  })
  if (sinConfirmar.length > 0) {
    throw new ErrorApi(
      422,
      'restriccion-sin-confirmar',
      'Hay propuestas en fechas con prohibición sin confirmación expresa',
      Object.fromEntries(sinConfirmar.map((p) => [p.clave, ['Confirma la programación pese a la prohibición']])),
    )
  }
  const instante = ahora.toISOString()
  return almacen.guardar({
    ...s,
    estado: 'Validada',
    etiqueta_estado: 'Validada',
    validador_id: 1,
    fecha_validacion: instante,
    fecha_modificacion: instante,
    contenido: { ...s.contenido, decision: resumir(propuestas, cuerpo.por_propuesta, null, 9000 + s.id * 100) },
  })
}

/** `POST ia/cronogramas/{id}/validar/` simulado. */
export function simularConfirmarCronograma(id: number, cuerpo: CuerpoValidacionCronograma) {
  return responderSimulado(() => confirmarSimulado(id, cuerpo))
}

/** Rechaza la propuesta completa (exportado para las pruebas). */
export function rechazarSimulado(id: number, motivo: string | null, ahora: Date = new Date()): SugerenciaCronograma {
  const s = buscar(id)
  if (s.estado !== 'Propuesta') throw errorConflicto(YA_REVISADA)
  const instante = ahora.toISOString()
  return almacen.guardar({
    ...s,
    estado: 'Rechazada',
    etiqueta_estado: 'Rechazada',
    validador_id: 1,
    fecha_validacion: instante,
    fecha_modificacion: instante,
    contenido: {
      ...s.contenido,
      decision: { por_propuesta: {}, resumen: { aceptados: 0, corregidos: 0, descartados: 0 }, programaciones_creadas: [], motivo_rechazo: motivo },
    },
  })
}

/** `POST ia/cronogramas/{id}/rechazar/` simulado. */
export function simularRechazarCronograma(id: number, motivo: string | null) {
  return responderSimulado(() => rechazarSimulado(id, motivo))
}

/** Programación ya registrada (ficticia), en días desde el inicio del periodo: [actividad, servicio, espacio, ubicación, día, días, responsable]. */
const EXISTENTES: [string, number, number, string, number, number, string][] = [
  ['Corte de césped y limpieza', 1, 13, 'Explanada de Ciencias', 0, 3, 'Verde Campus S.A.C. (demo)'],
  ['Mantenimiento de jardines', 5, 11, 'Jardín Central', 2, 1, 'Cuadrilla 2 (demo)'],
  ['Poda de altura a demanda', 4, 16, 'Bosque de Ficus', 4, 2, 'Arbolistas del Sur E.I.R.L. (demo)'],
  ['Mantenimiento de jardines', 5, 14, 'Plaza de Letras', 9, 1, 'Cuadrilla 2 (demo)'],
  ['Corte de césped y limpieza', 1, 16, 'Bosque de Ficus', 11, 3, 'Verde Campus S.A.C. (demo)'],
  ['Control fitosanitario', 2, 15, 'Jardín de Ingeniería', 15, 1, 'Arbolistas del Sur E.I.R.L. (demo)'],
  ['Mantenimiento de jardines', 5, 12, 'Tontódromo', 18, 1, 'Cuadrilla 1 (demo)'],
  ['Corte de césped y limpieza', 1, 11, 'Jardín Central', 25, 3, 'Verde Campus S.A.C. (demo)'],
]

/** Programación existente del periodo (exportada para las pruebas). Una se cruza con la propuesta en el Jardín Central. */
export function programacionExistenteDe(desde: string, hasta: string): ProgramacionExistente[] {
  return EXISTENTES.map(([actividad, servicio, areaId, ubicacion, dia, dias, responsable], i) => {
    const fecha_inicio = sumarDias(desde, dia)
    return {
      id: 7000 + i,
      tipo_servicio_id: servicio,
      actividad,
      area_verde_id: areaId,
      ubicacion,
      fecha_inicio,
      fecha_fin: sumarDias(fecha_inicio, dias - 1),
      modalidad: servicio === 5 ? ('PersonalPropio' as const) : ('Tercerizado' as const),
      responsable,
    }
  }).filter((p) => p.fecha_inicio <= hasta && p.fecha_fin >= desde)
}

/** Listado de MOD-03 simulado. */
export function simularProgramacionExistente(desde: string, hasta: string, signal?: AbortSignal) {
  return responderSimulado(() => (escenarioSimulado() === 'vacio' ? [] : programacionExistenteDe(desde, hasta)), { signal })
}
