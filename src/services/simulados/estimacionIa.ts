/**
 * Datos simulados de RF-IA-004 (estimación de recursos y duración), solo con `VITE_DATOS_SIMULADOS=true`.
 *
 * - 8 actividades o encargos ficticios de Operación de campo sin recursos confirmados.
 * - Una estimación determinista según el tipo, la superficie y la complejidad (mantenimiento: unos 400 m² por
 *   operario y jornada; poda menor: 2 a 3 operarios y 6 h…), con sus variables y 6 antecedentes comparables.
 * - Un almacén en memoria con 3 estimaciones (pendiente, confirmada con diferencias y descartada).
 * - Confirmar guarda las acciones, lo confirmado y la diferencia (`calcularDiferencia`, la misma que la pantalla).
 * - El registro manual (E1 y A1) crea un registro confirmado sin estimación.
 *
 * Escenarios con `?simular=`:
 * - `vacio`: la lista vacía y ninguna actividad estimable;
 * - `datos-insuficientes`: al solicitar, sin antecedentes y con una estimación genérica de baja confianza;
 * - `ia-no-disponible`: al solicitar, 503;
 * - `error`, `sin-permiso` y `sin-sesion`: los genéricos de `simulacion.ts`.
 */
import type { Paginado } from '@/types/comun'
import type { EstadoSugerencia } from '@/types/ia'
import type {
  ActividadEstimable,
  AntecedenteComparable,
  Complejidad,
  ContenidoEstimacion,
  CuerpoRecursosManual,
  CuerpoValidacionEstimacion,
  DescripcionActividad,
  EstimacionRecursos,
  SolicitudEstimacion,
  SugerenciaEstimacion,
} from '@/types/estimacionIa'
import { calcularDiferencia } from '@/utils/estimacionIa'
import { formatearNumero } from '@/utils/formato'
import { hoyLima } from '@/utils/instanteLima'
import { crearAlmacenSimulado, errorConflicto, errorNoEncontrado, escenarioSimulado, responderSimulado } from './simulacion'

const POR_PAGINA = 25

/** Tipos de servicio de los datos simulados (los mismos ids que el catálogo simulado de AV-297). */
const MANTENIMIENTO = 5
const PODA_MENOR = 6
const CORTE = 1
const FITOSANITARIO = 2

const NOMBRE_TIPO: Record<number, string> = {
  [MANTENIMIENTO]: 'Mantenimiento de jardines',
  [PODA_MENOR]: 'Poda menor',
  [CORTE]: 'Corte de césped',
  [FITOSANITARIO]: 'Control fitosanitario',
}

interface ActividadSimulada extends ActividadEstimable {
  tipo_servicio_id: number
  area_verde_id: number
  superficie_m2: number
  complejidad: Complejidad
}

function haceDias(dias: number): string {
  const [anio, mes, dia] = hoyLima().split('-').map(Number)
  return new Date(Date.UTC(anio, mes - 1, dia - dias)).toISOString().slice(0, 10)
}

/** [código, tipo, espacio id, espacio, m², complejidad, días hasta la fecha prevista] */
const SEMILLAS: [string, number, number, string, number, Complejidad, number][] = [
  ['ENC-2026-041', MANTENIMIENTO, 11, 'Jardín Central', 1600, 'Media', -2],
  ['ENC-2026-044', PODA_MENOR, 16, 'Bosque de Ficus', 900, 'Alta', -3],
  ['ENC-2026-045', CORTE, 12, 'Tontódromo', 4200, 'Baja', -4],
  ['ENC-2026-046', FITOSANITARIO, 13, 'Explanada de Ciencias', 1200, 'Media', -5],
  ['ENC-2026-047', MANTENIMIENTO, 14, 'Plaza de Letras', 800, 'Baja', -6],
  ['ENC-2026-048', PODA_MENOR, 15, 'Jardín de Ingeniería', 600, 'Media', -8],
  ['ENC-2026-049', CORTE, 13, 'Explanada de Ciencias', 5200, 'Media', -9],
  ['ENC-2026-050', MANTENIMIENTO, 12, 'Tontódromo', 2400, 'Alta', -10],
]

const ACTIVIDADES: ActividadSimulada[] = SEMILLAS.map(([codigo, tipo, area, espacio, m2, complejidad, dias], i) => ({
  actividad_id: 4100 + i,
  codigo,
  tipo_actividad: NOMBRE_TIPO[tipo],
  espacio,
  fecha_prevista: haceDias(dias),
  tipo_servicio_id: tipo,
  area_verde_id: area,
  superficie_m2: m2,
  complejidad,
}))

const EXTRA_COMPLEJIDAD: Record<Complejidad, number> = { Baja: 0, Media: 0, Alta: 1 }

/** Estimación determinista según el tipo, la superficie y la complejidad (exportada para las pruebas). */
export function estimar(tipo: number, superficie: number | null, complejidad: Complejidad | null): EstimacionRecursos {
  const m2 = superficie ?? 1000
  const extra = EXTRA_COMPLEJIDAD[complejidad ?? 'Media']
  if (tipo === PODA_MENOR) {
    return {
      operarios_min: 2,
      operarios_max: 3,
      operarios_sugeridos: 3,
      duracion: 6 + extra * 2,
      unidad_duracion: 'horas',
      insumos: [
        { nombre: 'Combustible para motosierra', cantidad: 2, unidad: 'L' },
        { nombre: 'Aceite de cadena', cantidad: 0.5, unidad: 'L' },
      ],
    }
  }
  if (tipo === CORTE) {
    const sugeridos = Math.max(2, Math.ceil(m2 / 1500)) + extra
    return {
      operarios_min: sugeridos - 1,
      operarios_max: sugeridos + 1,
      operarios_sugeridos: sugeridos,
      duracion: Math.round((m2 / (sugeridos * 250)) * 2) / 2,
      unidad_duracion: 'horas',
      insumos: [
        { nombre: 'Combustible para desbrozadora', cantidad: Math.ceil(m2 / 1000), unidad: 'L' },
        { nombre: 'Bolsas de residuos', cantidad: Math.ceil(m2 / 100), unidad: 'u' },
      ],
    }
  }
  if (tipo === FITOSANITARIO) {
    return {
      operarios_min: 2,
      operarios_max: 2,
      operarios_sugeridos: 2,
      duracion: 4 + extra * 2,
      unidad_duracion: 'horas',
      insumos: [
        { nombre: 'Insecticida sistémico', cantidad: Math.max(1, Math.round(m2 / 600)), unidad: 'L' },
        { nombre: 'Guantes de nitrilo', cantidad: 4, unidad: 'u' },
      ],
    }
  }
  // Mantenimiento de jardines: unos 400 m² por operario y jornada.
  const sugeridos = Math.max(1, Math.ceil(m2 / 400)) + extra
  return {
    operarios_min: Math.max(1, sugeridos - 1),
    operarios_max: sugeridos + 1,
    operarios_sugeridos: sugeridos,
    duracion: 1,
    unidad_duracion: 'jornadas',
    insumos: [
      { nombre: 'Fertilizante NPK 20-20-20', cantidad: Math.max(1, Math.round(m2 / 320)), unidad: 'kg' },
      { nombre: 'Bolsas de residuos', cantidad: Math.max(10, Math.round(m2 / 50)), unidad: 'u' },
    ],
  }
}

function antecedentesDe(tipo: number, espacio: string | null): AntecedenteComparable[] {
  return Array.from({ length: 6 }, (_, i) => ({
    codigo: `ENC-2026-${String(10 + i * 4).padStart(3, '0')}`,
    fecha: haceDias(20 + i * 18),
    espacio,
    operarios: tipo === PODA_MENOR ? 2 + (i % 2) : 3 + (i % 3) - 1,
    duracion_horas: tipo === MANTENIMIENTO ? 7 + (i % 2) : 5 + (i % 3) * 0.5,
  }))
}

function contenidoDe(solicitud: SolicitudEstimacion, ahora: string): ContenidoEstimacion {
  const insuficiente = escenarioSimulado() === 'datos-insuficientes'
  const actividad = ACTIVIDADES.find((a) => a.actividad_id === solicitud.actividad_id) ?? null
  const descripcion: DescripcionActividad | null = solicitud.descripcion ?? null
  const tipo = actividad?.tipo_servicio_id ?? descripcion?.tipo_servicio_id ?? MANTENIMIENTO
  const superficie = actividad?.superficie_m2 ?? descripcion?.superficie_m2 ?? null
  const complejidad = actividad?.complejidad ?? descripcion?.complejidad ?? null
  const espacio = actividad?.espacio ?? null
  const antecedentes = insuficiente ? [] : antecedentesDe(tipo, espacio)
  const estimacion: EstimacionRecursos = insuficiente
    ? { operarios_min: 2, operarios_max: 3, operarios_sugeridos: 2, duracion: 1, unidad_duracion: 'jornadas', insumos: [] }
    : estimar(tipo, superficie, complejidad)
  return {
    version_contenido: 1,
    ia: { proveedor: 'Simulado', modelo: 'demo-estimacion', solicitado_en: ahora, duracion_ms: 2600 },
    suficiencia: insuficiente ? 'insuficiente' : superficie === null ? 'parcial' : 'suficiente',
    faltantes: insuficiente
      ? ['No hay actividades comparables registradas de este tipo en este espacio']
      : superficie === null
        ? ['No se indicó la superficie: la estimación usa 1 000 m²']
        : [],
    datos_utilizados: [
      'Tipo de actividad y superficie del espacio',
      `${antecedentes.length} actividades comparables de los últimos 4 meses`,
      'Operarios y duración reales registrados en los partes',
    ],
    limitaciones: insuficiente
      ? ['Estimación con baja confianza: sin antecedentes comparables', 'Sin estimación de insumos']
      : ['No considera el estado del clima ni ausencias de personal'],
    explicacion: insuficiente
      ? 'Sin antecedentes, se propone una cuadrilla mínima de una jornada como referencia.'
      : 'Se escala el rendimiento medio de las actividades comparables a la superficie y la complejidad.',
    actividad: actividad && {
      actividad_id: actividad.actividad_id,
      codigo: actividad.codigo,
      tipo_actividad: actividad.tipo_actividad,
      espacio: actividad.espacio,
      fecha_prevista: actividad.fecha_prevista,
    },
    descripcion,
    estimacion,
    variables: [
      { nombre: 'Tipo de actividad', valor: NOMBRE_TIPO[tipo] ?? 'Sin tipo' },
      { nombre: 'Superficie', valor: superficie === null ? 'No indicada' : `${formatearNumero(superficie)} m²` },
      { nombre: 'Complejidad', valor: complejidad ?? 'No indicada' },
      { nombre: 'Estación', valor: 'Primavera' },
      { nombre: 'Antecedentes comparables', valor: String(antecedentes.length) },
      { nombre: 'Duración media real', valor: insuficiente ? 'Sin datos' : '5,5 h' },
    ],
    antecedentes,
    decision: null,
  }
}

function crear(id: number, solicitud: SolicitudEstimacion, ahora: string): SugerenciaEstimacion {
  return {
    id,
    tipo: 'EstimacionRecursos',
    entidad: 'Actividad',
    registro_id: solicitud.actividad_id ?? 0,
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

function iniciales(): SugerenciaEstimacion[] {
  const pendiente = crear(1, { actividad_id: 4100 }, `${haceDias(1)}T09:10:00-05:00`)
  const confirmada = crear(2, { actividad_id: 4101 }, `${haceDias(4)}T08:20:00-05:00`)
  const est = confirmada.contenido.estimacion
  if (est) {
    const confirmado = {
      operarios: est.operarios_sugeridos - 1,
      duracion: est.duracion + 2,
      unidad_duracion: est.unidad_duracion,
      insumos: [...est.insumos.slice(0, 1), { nombre: 'Guantes anticorte', cantidad: 2, unidad: 'u' }],
    }
    confirmada.contenido.decision = {
      acciones: { operarios: 'corregir', duracion: 'corregir', insumos: 'corregir' },
      confirmado,
      diferencia: calcularDiferencia(est, confirmado),
    }
  }
  Object.assign(confirmada, { estado: 'Validada', etiqueta_estado: 'Validada', validador_id: 1, fecha_validacion: `${haceDias(4)}T11:45:00-05:00` })
  const descartada = crear(3, { actividad_id: 4104 }, `${haceDias(7)}T15:00:00-05:00`)
  Object.assign(descartada, { estado: 'Rechazada', etiqueta_estado: 'Rechazada', validador_id: 1, fecha_validacion: `${haceDias(7)}T15:30:00-05:00` })
  return [pendiente, confirmada, descartada]
}

const almacen = crearAlmacenSimulado(iniciales())

/** `GET ia/estimaciones/` simulado. */
export function simularListarEstimaciones(filtros: { estado?: EstadoSugerencia; page?: number }, signal?: AbortSignal) {
  return responderSimulado<Paginado<SugerenciaEstimacion>>(() => {
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

/** `GET ia/estimaciones/actividades-pendientes/?q=` simulado (exportado para las pruebas). */
export function buscarActividadesSimulado(q: string): Paginado<ActividadEstimable> {
  const texto = q.trim().toLowerCase()
  const encontradas =
    escenarioSimulado() === 'vacio'
      ? []
      : ACTIVIDADES.filter((a) => !texto || `${a.codigo} ${a.tipo_actividad} ${a.espacio ?? ''}`.toLowerCase().includes(texto)).map(
          ({ actividad_id, codigo, tipo_actividad, espacio, fecha_prevista }) => ({ actividad_id, codigo, tipo_actividad, espacio, fecha_prevista }),
        )
  return { count: encontradas.length, next: null, previous: null, results: encontradas }
}

export function simularBuscarActividades(q: string, signal?: AbortSignal) {
  return responderSimulado(() => buscarActividadesSimulado(q), { signal, demoraMs: 250 })
}

/** Crea la estimación (exportado para las pruebas). */
export function solicitarSimulado(solicitud: SolicitudEstimacion, ahora: Date = new Date()): SugerenciaEstimacion {
  return almacen.guardar(crear(almacen.siguienteId(), solicitud, ahora.toISOString()))
}

/** `POST ia/estimaciones/` simulado (llamada de IA: admite `?simular=ia-no-disponible`). */
export function simularSolicitarEstimacion(solicitud: SolicitudEstimacion) {
  return responderSimulado(() => solicitarSimulado(solicitud), { esIa: true, demoraMs: 1500 })
}

function buscar(id: number): SugerenciaEstimacion {
  const s = almacen.obtener(id)
  if (!s) throw errorNoEncontrado()
  return s
}

/** `GET ia/estimaciones/{id}/` simulado. */
export function simularObtenerEstimacion(id: number, signal?: AbortSignal) {
  return responderSimulado(() => buscar(id), { signal })
}

const YA_REVISADA = 'Esta estimación ya fue revisada. Recarga la página para ver su estado.'

/** Confirma los recursos (exportado para las pruebas). */
export function confirmarSimulado(id: number, cuerpo: CuerpoValidacionEstimacion, ahora: Date = new Date()): SugerenciaEstimacion {
  const s = buscar(id)
  if (s.estado !== 'Propuesta') throw errorConflicto(YA_REVISADA)
  const instante = ahora.toISOString()
  return almacen.guardar({
    ...s,
    estado: 'Validada',
    etiqueta_estado: 'Validada',
    validador_id: 1,
    fecha_validacion: instante,
    fecha_modificacion: instante,
    contenido: { ...s.contenido, decision: { ...cuerpo, diferencia: calcularDiferencia(s.contenido.estimacion, cuerpo.confirmado) } },
  })
}

export function simularConfirmarEstimacion(id: number, cuerpo: CuerpoValidacionEstimacion) {
  return responderSimulado(() => confirmarSimulado(id, cuerpo))
}

/** Descarta la estimación (exportado para las pruebas). */
export function descartarSimulado(id: number, ahora: Date = new Date()): SugerenciaEstimacion {
  const s = buscar(id)
  if (s.estado !== 'Propuesta') throw errorConflicto(YA_REVISADA)
  const instante = ahora.toISOString()
  return almacen.guardar({ ...s, estado: 'Rechazada', etiqueta_estado: 'Rechazada', validador_id: 1, fecha_validacion: instante, fecha_modificacion: instante })
}

export function simularDescartarEstimacion(id: number, _motivo: string | null) {
  return responderSimulado(() => descartarSimulado(id))
}

/** Registro manual sin recomendación (E1 y A1; exportado para las pruebas). */
export function manualSimulado(cuerpo: CuerpoRecursosManual, ahora: Date = new Date()): SugerenciaEstimacion {
  const instante = ahora.toISOString()
  const base = crear(almacen.siguienteId(), cuerpo, instante)
  return almacen.guardar({
    ...base,
    estado: 'Validada',
    etiqueta_estado: 'Validada',
    validador_id: 1,
    fecha_validacion: instante,
    contenido: {
      ...base.contenido,
      suficiencia: 'insuficiente',
      faltantes: [],
      explicacion: 'Recursos registrados de forma manual, sin recomendación de la IA.',
      limitaciones: [],
      estimacion: null,
      variables: [],
      antecedentes: [],
      decision: {
        acciones: { operarios: 'corregir', duracion: 'corregir', insumos: 'corregir' },
        confirmado: cuerpo.confirmado,
        diferencia: calcularDiferencia(null, cuerpo.confirmado),
      },
    },
  })
}

/** `POST ia/estimaciones/manual/` simulado (no llama a la IA: funciona aunque la IA no esté disponible). */
export function simularRegistrarManual(cuerpo: CuerpoRecursosManual) {
  return responderSimulado(() => manualSimulado(cuerpo))
}
