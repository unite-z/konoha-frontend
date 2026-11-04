/**
 * Datos simulados de RF-IA-005 (clasificación de incidencias con IA), solo con `VITE_DATOS_SIMULADOS=true`.
 *
 * - 8 incidencias ficticias en estado Registrada, cada una con la sugerencia que daría la IA, sus motivos por campo,
 *   antecedentes y limitaciones. «Problema en jardín» (sin fotos y con poca descripción) da datos insuficientes.
 * - Un almacén en memoria con 3 análisis (2 clasificados y 1 descartado). Se pierde al recargar.
 * - Validar exige decidir los campos y que los obligatorios queden con valor; la incidencia pasa a «Clasificada» y
 *   sale de pendientes. Nunca se deriva. Descartar la deja en Registrada. La clasificación manual no usa la IA.
 *
 * Escenarios con `?simular=`:
 * - `vacio`: sin incidencias pendientes ni análisis;
 * - `datos-insuficientes`: cualquier análisis sale con evidencia insuficiente y sin severidad;
 * - `ia-no-disponible`: al solicitar, 503;
 * - `error`, `sin-permiso` y `sin-sesion`: los genéricos de `simulacion.ts`.
 */
import { ErrorApi } from '../api/cliente'
import type { Paginado } from '@/types/comun'
import type {
  ContenidoClasificacion,
  CuerpoClasificacionManual,
  CuerpoValidacionClasificacion,
  IncidenciaResumen,
  SugerenciaClasificacion,
  ValoresClasificacion,
} from '@/types/clasificacionIncidenciaIa'
import type { EstadoSugerencia } from '@/types/ia'
import { CAMPOS_OBLIGATORIOS, validarManual } from '@/utils/clasificacionIncidenciaIa'
import { CLASIFICADAS, haceDias, INCIDENCIAS, type IncidenciaSimulada } from './clasificacionIncidenciaIaDatos'
import { crearAlmacenSimulado, errorConflicto, errorNoEncontrado, escenarioSimulado, responderSimulado } from './simulacion'

const POR_PAGINA = 25

/** Estado de cada incidencia simulada (Registrada o Clasificada). */
const estados = new Map<number, string>(INCIDENCIAS.map((i) => [i.incidencia.id, 'Registrada']))

function contenidoDe(fuente: IncidenciaSimulada, forzarInsuficiente: boolean, ahora: string): ContenidoClasificacion {
  const insuficiente = forzarInsuficiente || Boolean(fuente.insuficiente)
  const { incidencia: inc } = fuente
  return {
    version_contenido: 1,
    ia: { proveedor: 'Simulado', modelo: 'demo-clasificacion', solicitado_en: ahora, duracion_ms: 2100 },
    suficiencia: insuficiente ? 'insuficiente' : inc.fotografias.length === 0 ? 'parcial' : 'suficiente',
    faltantes: insuficiente ? ['Describe el problema y su ubicación', 'Adjunta una fotografía'] : [],
    datos_utilizados: [
      'Descripción de la incidencia',
      inc.fotografias.length === 1 ? '1 fotografía' : `${inc.fotografias.length} fotografías`,
      ...(inc.ejemplar ? [`Ejemplar ${inc.ejemplar.codigo}${inc.ejemplar.especie ? `, ${inc.ejemplar.especie}` : ''}`] : []),
      `${fuente.antecedentes.length} incidencias previas en el espacio`,
    ],
    limitaciones: inc.fotografias.length === 0 ? ['Sin fotografía: la severidad se infiere solo de la descripción'] : ['La IA no ha visto el lugar: confírmalo con una inspección si hay dudas'],
    explicacion: insuficiente
      ? 'Con tan poca información no se puede valorar el riesgo. Completa la incidencia o clasifícala manualmente.'
      : 'Se compara la descripción, las fotografías y el historial del espacio con incidencias parecidas ya clasificadas.',
    incidencia: { ...inc, estado: estados.get(inc.id) ?? inc.estado },
    sugerencia: insuficiente ? { ...fuente.sugerencia, severidad: null } : fuente.sugerencia,
    motivos: fuente.motivos,
    antecedentes: insuficiente ? [] : fuente.antecedentes,
    decision: null,
  }
}

function crear(id: number, fuente: IncidenciaSimulada, ahora: string, forzarInsuficiente = false): SugerenciaClasificacion {
  return {
    id,
    tipo: 'ClasificacionIncidencia',
    entidad: 'Incidencia',
    registro_id: fuente.incidencia.id,
    archivo_id: null,
    contenido: contenidoDe(fuente, forzarInsuficiente, ahora),
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

function iniciales(): SugerenciaClasificacion[] {
  return CLASIFICADAS.map((fuente, i) => {
    const s = crear(i + 1, fuente, `${haceDias(8 - i)}T10:00:00-05:00`)
    const descartada = i === 2
    Object.assign(s, {
      estado: descartada ? 'Rechazada' : 'Validada',
      etiqueta_estado: descartada ? 'Rechazada' : 'Validada',
      validador_id: 1,
      fecha_validacion: `${haceDias(7 - i)}T11:30:00-05:00`,
    })
    if (!descartada) {
      s.contenido.decision = {
        por_campo: {
          tipo_evento: { accion: 'aceptar', valor_final: null },
          categoria: { accion: 'aceptar', valor_final: null },
          severidad: i === 0 ? { accion: 'corregir', valor_final: 'Alta' } : { accion: 'aceptar', valor_final: null },
          via_atencion: { accion: 'aceptar', valor_final: null },
          es_sencilla: { accion: 'descartar', valor_final: null },
        },
        valores_registrados: { ...fuente.sugerencia, severidad: 'Alta', es_sencilla: null },
      }
    }
    return s
  })
}

const almacen = crearAlmacenSimulado(iniciales())

const paginar = <T,>(todos: T[], page = 1): Paginado<T> => {
  const pagina = Math.max(1, page)
  return {
    count: todos.length,
    next: pagina * POR_PAGINA < todos.length ? `?page=${pagina + 1}` : null,
    previous: pagina > 1 ? `?page=${pagina - 1}` : null,
    results: todos.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
  }
}

/** Incidencias Registradas (exportado para las pruebas). */
export function pendientesSimulado(q = '', page = 1): Paginado<IncidenciaResumen> {
  const texto = q.trim().toLowerCase()
  const lista =
    escenarioSimulado() === 'vacio'
      ? []
      : INCIDENCIAS.filter((i) => estados.get(i.incidencia.id) === 'Registrada')
          .map((i) => i.incidencia)
          .filter((i) => !texto || `${i.codigo} ${i.descripcion} ${i.espacio ?? ''}`.toLowerCase().includes(texto))
  return paginar(lista, page)
}

export function simularListarPendientes(filtros: { q?: string; page?: number }, signal?: AbortSignal) {
  return responderSimulado(() => pendientesSimulado(filtros.q, filtros.page), { signal })
}

export function simularListarClasificaciones(filtros: { estado?: EstadoSugerencia; page?: number }, signal?: AbortSignal) {
  return responderSimulado(() => {
    const todas =
      escenarioSimulado() === 'vacio'
        ? []
        : almacen
            .listar()
            .filter((s) => !filtros.estado || s.estado === filtros.estado)
            .sort((a, b) => (b.fecha_creacion ?? '').localeCompare(a.fecha_creacion ?? '') || b.id - a.id)
    return paginar(todas, filtros.page)
  }, { signal })
}

function fuenteDe(incidenciaId: number): IncidenciaSimulada {
  const fuente = INCIDENCIAS.find((i) => i.incidencia.id === incidenciaId)
  if (!fuente) throw errorNoEncontrado()
  return fuente
}

/** Analiza una incidencia (exportado para las pruebas). */
export function solicitarSimulado(incidenciaId: number, ahora: Date = new Date()): SugerenciaClasificacion {
  return almacen.guardar(crear(almacen.siguienteId(), fuenteDe(incidenciaId), ahora.toISOString(), escenarioSimulado() === 'datos-insuficientes'))
}

export function simularSolicitarClasificacion(incidenciaId: number) {
  return responderSimulado(() => solicitarSimulado(incidenciaId), { esIa: true, demoraMs: 1500 })
}

function buscar(id: number): SugerenciaClasificacion {
  const s = almacen.obtener(id)
  if (!s) throw errorNoEncontrado()
  return s
}

export function simularObtenerClasificacion(id: number, signal?: AbortSignal) {
  return responderSimulado(() => buscar(id), { signal })
}

const YA_REVISADA = 'Este análisis ya fue revisado. Recarga la página para ver su estado.'

/** Registra la clasificación validada (exportado para las pruebas). Nunca deriva la incidencia. */
export function validarSimulado(id: number, cuerpo: CuerpoValidacionClasificacion, ahora: Date = new Date()): SugerenciaClasificacion {
  const s = buscar(id)
  if (s.estado !== 'Propuesta') throw errorConflicto(YA_REVISADA)
  const sugerido = s.contenido.sugerencia
  const valor = <C extends keyof ValoresClasificacion>(c: C): ValoresClasificacion[C] => {
    const d = cuerpo.por_campo[c]
    if (d?.accion === 'aceptar') return sugerido?.[c] ?? null
    if (d?.accion === 'corregir') return d.valor_final as ValoresClasificacion[C]
    return null
  }
  const registrados: ValoresClasificacion = {
    tipo_evento: valor('tipo_evento'),
    categoria: valor('categoria'),
    severidad: valor('severidad'),
    via_atencion: valor('via_atencion'),
    es_sencilla: valor('es_sencilla'),
  }
  const vacios = CAMPOS_OBLIGATORIOS.filter((c) => registrados[c] === null)
  if (vacios.length > 0) {
    throw new ErrorApi(400, 'clasificacion-incompleta', 'Faltan campos obligatorios de la clasificación', Object.fromEntries(vacios.map((c) => [c, ['Obligatorio']])))
  }
  estados.set(s.contenido.incidencia.id, 'Clasificada')
  const instante = ahora.toISOString()
  return almacen.guardar({
    ...s,
    estado: 'Validada',
    etiqueta_estado: 'Validada',
    validador_id: 1,
    fecha_validacion: instante,
    fecha_modificacion: instante,
    contenido: { ...s.contenido, incidencia: { ...s.contenido.incidencia, estado: 'Clasificada' }, decision: { por_campo: cuerpo.por_campo, valores_registrados: registrados } },
  })
}

export function simularValidarClasificacion(id: number, cuerpo: CuerpoValidacionClasificacion) {
  return responderSimulado(() => validarSimulado(id, cuerpo))
}

/** Descarta la sugerencia: la incidencia sigue Registrada (exportado para las pruebas). */
export function descartarSimulado(id: number, ahora: Date = new Date()): SugerenciaClasificacion {
  const s = buscar(id)
  if (s.estado !== 'Propuesta') throw errorConflicto(YA_REVISADA)
  const instante = ahora.toISOString()
  return almacen.guardar({ ...s, estado: 'Rechazada', etiqueta_estado: 'Rechazada', validador_id: 1, fecha_validacion: instante, fecha_modificacion: instante })
}

export function simularDescartarClasificacion(id: number, _motivo: string | null) {
  return responderSimulado(() => descartarSimulado(id))
}

/** Clasificación manual sin IA (E1 y A1; exportado para las pruebas). */
export function manualSimulado(cuerpo: CuerpoClasificacionManual, ahora: Date = new Date()): SugerenciaClasificacion {
  const errores = validarManual(cuerpo.valores)
  if (Object.keys(errores).length > 0) {
    throw new ErrorApi(400, 'clasificacion-incompleta', 'Faltan campos obligatorios de la clasificación', Object.fromEntries(Object.keys(errores).map((c) => [c, ['Obligatorio']])))
  }
  const fuente = fuenteDe(cuerpo.incidencia_id)
  const instante = ahora.toISOString()
  const base = crear(almacen.siguienteId(), fuente, instante)
  estados.set(fuente.incidencia.id, 'Clasificada')
  return almacen.guardar({
    ...base,
    estado: 'Validada',
    etiqueta_estado: 'Validada',
    validador_id: 1,
    fecha_validacion: instante,
    contenido: {
      ...base.contenido,
      incidencia: { ...base.contenido.incidencia, estado: 'Clasificada' },
      suficiencia: 'insuficiente',
      faltantes: [],
      explicacion: 'Clasificación registrada de forma manual, sin sugerencia de la IA.',
      limitaciones: [],
      sugerencia: null,
      motivos: {},
      decision: {
        por_campo: Object.fromEntries(Object.entries(cuerpo.valores).map(([c, v]) => [c, { accion: 'corregir', valor_final: v }])),
        valores_registrados: cuerpo.valores,
      },
    },
  })
}

/** `POST ia/clasificaciones-incidencia/manual/` simulado (no llama a la IA). */
export function simularClasificarManual(cuerpo: CuerpoClasificacionManual) {
  return responderSimulado(() => manualSimulado(cuerpo))
}
