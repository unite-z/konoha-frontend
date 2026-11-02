/**
 * Datos simulados de RF-REP-010 (programado frente a ejecutado), solo con `VITE_DATOS_SIMULADOS=true`.
 * 40 programaciones ficticias de los últimos 3 meses (contadas desde hoy en Lima): ~60 % ejecutadas, 10 % con
 * desviación, 10 % en curso, 15 % pendientes y 5 % canceladas; y 3 ejecuciones sin programación.
 * El periodo y los filtros se aplican igual a las programaciones y a las ejecuciones (criterio 3); la situación sale
 * de `situacionDe`, la misma regla que documenta el tipo.
 *
 * Escenarios con `?simular=`:
 * - `vacio`: el periodo sin trabajos programados (`sin_datos`);
 * - `datos-insuficientes`: el personal propio sin datos (como hoy con backend) y sin sus filas;
 * - `error`, `sin-permiso` y `sin-sesion`: los genéricos de `simulacion.ts`.
 */
import type { Modalidad } from '../../types/reportes'
import type {
  CatalogoComparacion,
  ComparacionPorServicio,
  ConsultaProgramadoEjecutado,
  EjecucionVinculada,
  FilaProgramadoEjecutado,
  ResultadoProgramadoEjecutado,
} from '../../types/reportesGestion'
import { hoyLima } from '../../utils/instanteLima'
import { insigniaSituacion, situacionDe } from '../../utils/programadoEjecutado'
import { escenarioSimulado, responderSimulado } from './simulacion'

const SERVICIOS: { id: number; nombre: string; modalidad: Modalidad; responsables: string[] }[] = [
  { id: 1, nombre: 'Corte de césped', modalidad: 'Tercerizado', responsables: ['Verde Campus S.A.C. (demo)'] },
  { id: 2, nombre: 'Control fitosanitario', modalidad: 'Tercerizado', responsables: ['Arbolistas del Sur E.I.R.L. (demo)'] },
  { id: 3, nombre: 'Poda mayor programada', modalidad: 'Tercerizado', responsables: ['Arbolistas del Sur E.I.R.L. (demo)'] },
  { id: 5, nombre: 'Mantenimiento de jardines', modalidad: 'PersonalPropio', responsables: ['Cuadrilla 1 (demo)', 'Cuadrilla 2 (demo)'] },
]

const ESPACIOS = [
  { id: 11, nombre: 'Jardín Central' },
  { id: 12, nombre: 'Tontódromo' },
  { id: 13, nombre: 'Explanada de Ciencias' },
  { id: 14, nombre: 'Plaza de Letras' },
  { id: 15, nombre: 'Jardín de Ingeniería' },
]

type Resultado = 'ejecutado' | 'desviacion' | 'curso' | 'pendiente' | 'cancelado'

/** Resultado de cada programación por posición (0 = la más reciente); el resto, ejecutadas. */
const RESULTADOS: Record<number, Resultado> = {
  0: 'pendiente',
  1: 'pendiente',
  2: 'pendiente',
  3: 'pendiente',
  4: 'curso',
  5: 'curso',
  6: 'curso',
  8: 'curso',
  9: 'pendiente',
  23: 'pendiente',
  7: 'desviacion',
  12: 'desviacion',
  20: 'desviacion',
  28: 'desviacion',
  15: 'cancelado',
  31: 'cancelado',
}

const TOTAL = 40

/** Fecha (`AAAA-MM-DD`) `dias` antes de `hoy` (negativo = después). */
function restarDias(hoy: string, dias: number): string {
  const [anio, mes, dia] = hoy.split('-').map(Number)
  return new Date(Date.UTC(anio, mes - 1, dia - dias)).toISOString().slice(0, 10)
}

interface Programacion {
  fila: FilaProgramadoEjecutado
  tipo_servicio_id: number
  area_verde_id: number
}

interface EjecucionSuelta {
  ejecucion: EjecucionVinculada
  tipo_servicio_id: number
  area_verde_id: number
  modalidad: Modalidad
  fecha: string
}

function ejecucionDe(servicio: (typeof SERVICIOS)[number], i: number, inicio: string | null, fin: string | null): EjecucionVinculada {
  const propio = servicio.modalidad === 'PersonalPropio'
  const estado = fin ? (propio ? 'Completada' : 'Conforme / cerrado') : propio ? 'En curso' : 'En ejecución'
  return {
    origen: propio ? 'Actividad' : 'Atencion',
    id: 7000 + i,
    codigo: propio ? `ACT-2026-${String(300 + i).padStart(4, '0')}` : `AT-2026-${String(30 + i).padStart(4, '0')}`,
    estado,
    etiqueta_estado: estado,
    inicio_real: inicio ? `${inicio}T08:00:00-05:00` : null,
    fin_real: fin ? `${fin}T15:00:00-05:00` : null,
  }
}

function crearProgramaciones(hoy: string): Programacion[] {
  return Array.from({ length: TOTAL }, (_, i) => {
    const servicio = SERVICIOS[i % SERVICIOS.length]
    const espacio = ESPACIOS[(i * 3) % ESPACIOS.length]
    const inicio = restarDias(hoy, i * 2 - 4)
    const fin = restarDias(hoy, i * 2 - 6)
    const resultado = RESULTADOS[i] ?? 'ejecutado'
    const retraso = 1 + (i % 6)
    const ejecuciones =
      resultado === 'ejecutado' || resultado === 'desviacion'
        ? [ejecucionDe(servicio, i, inicio, resultado === 'desviacion' ? restarDias(fin, -retraso) : fin)]
        : resultado === 'curso'
          ? [ejecucionDe(servicio, i, inicio, null)]
          : []
    const estado = resultado === 'cancelado' ? 'Cancelada' : resultado === 'pendiente' ? 'Programada' : resultado === 'curso' ? 'EnCurso' : 'Completada'
    const base = { estado_programacion: estado, fin_previsto: fin } as const
    const { situacion, desviacion_dias } = situacionDe(base, ejecuciones)
    return {
      tipo_servicio_id: servicio.id,
      area_verde_id: espacio.id,
      fila: {
        programacion_id: 600 + i,
        tipo_servicio: servicio.nombre,
        modalidad: servicio.modalidad,
        responsable: servicio.responsables[i % servicio.responsables.length],
        espacio: espacio.nombre,
        ventana_mes: servicio.modalidad === 'Tercerizado' ? inicio.slice(0, 7) : null,
        inicio_previsto: inicio,
        ...base,
        ejecuciones,
        situacion,
        etiqueta_situacion: insigniaSituacion(situacion).texto,
        desviacion_dias,
      },
    }
  })
}

/** Ejecuciones sin programación: [servicio, espacio, días atrás] (posiciones en SERVICIOS y ESPACIOS). */
const SUELTAS: [number, number, number][] = [
  [0, 1, 10],
  [2, 3, 33],
  [3, 0, 47],
]

function crearSueltas(hoy: string): EjecucionSuelta[] {
  return SUELTAS.map(([indiceServicio, indiceEspacio, dias], i) => {
    const servicio = SERVICIOS[indiceServicio]
    const fecha = restarDias(hoy, dias)
    return {
      ejecucion: ejecucionDe(servicio, 90 + i, fecha, fecha),
      tipo_servicio_id: servicio.id,
      area_verde_id: ESPACIOS[indiceEspacio].id,
      modalidad: servicio.modalidad,
      fecha,
    }
  })
}

const SIN_PERSONAL_PROPIO = 'Las actividades de personal propio aún no están disponibles'

/** Comparación calculada a partir de la consulta (exportada para las pruebas). */
export function calcularProgramadoEjecutado(consulta: ConsultaProgramadoEjecutado, hoy: string = hoyLima()): ResultadoProgramadoEjecutado {
  const escenario = escenarioSimulado()
  const sinPropio = escenario === 'datos-insuficientes'
  // Los mismos filtros para los dos conjuntos (criterio 3).
  const cumple = (x: { tipo_servicio_id: number; area_verde_id: number; modalidad: Modalidad; fecha: string }) =>
    x.fecha >= consulta.desde &&
    x.fecha <= consulta.hasta &&
    (consulta.tipo_servicio_id === undefined || x.tipo_servicio_id === consulta.tipo_servicio_id) &&
    (consulta.area_verde_id === undefined || x.area_verde_id === consulta.area_verde_id) &&
    (consulta.modalidad === undefined || x.modalidad === consulta.modalidad) &&
    !(sinPropio && x.modalidad === 'PersonalPropio')

  const programaciones =
    escenario === 'vacio'
      ? []
      : crearProgramaciones(hoy).filter((p) => cumple({ ...p, modalidad: p.fila.modalidad, fecha: p.fila.inicio_previsto }))
  const filas = programaciones.map((p) => p.fila)
  const sueltas = escenario === 'vacio' ? [] : crearSueltas(hoy).filter(cumple).map((s) => s.ejecucion)

  const cuenta = (situacion: FilaProgramadoEjecutado['situacion']) => filas.filter((f) => f.situacion === situacion).length
  const ejecutados = cuenta('Ejecutado')
  const conDesviacion = cuenta('EjecutadoConDesviacion')
  const cancelados = cuenta('Cancelado')
  const base = filas.length - cancelados

  const porServicio: ComparacionPorServicio[] = SERVICIOS.map((s) => {
    const propias = programaciones.filter((p) => p.tipo_servicio_id === s.id).map((p) => p.fila)
    return {
      tipo_servicio_id: s.id,
      tipo_servicio: s.nombre,
      modalidad: s.modalidad,
      programados: propias.length,
      ejecutados: propias.filter((f) => f.situacion === 'Ejecutado' || f.situacion === 'EjecutadoConDesviacion').length,
      pendientes: propias.filter((f) => f.situacion === 'Pendiente').length,
    }
  }).filter((s) => s.programados > 0)

  return {
    periodo: { desde: consulta.desde, hasta: consulta.hasta },
    filtros_aplicados: {
      tipo_servicio_id: consulta.tipo_servicio_id ?? null,
      area_verde_id: consulta.area_verde_id ?? null,
      modalidad: consulta.modalidad ?? null,
      situacion: consulta.situacion ?? null,
    },
    generado_en: new Date().toISOString(),
    sin_datos: filas.length === 0,
    mensaje_sin_datos: filas.length === 0 ? 'No hay trabajos programados en el periodo seleccionado' : null,
    resumen: {
      programados: filas.length,
      ejecutados,
      ejecutados_con_desviacion: conDesviacion,
      en_curso: cuenta('EnCurso'),
      pendientes: cuenta('Pendiente'),
      cancelados,
      porcentaje_cumplimiento: base > 0 ? String(Math.round(((ejecutados + conDesviacion) / base) * 1000) / 10) : null,
      ejecuciones_sin_programacion: sueltas.length,
    },
    por_servicio: porServicio,
    filas,
    sin_programacion: sueltas,
    personal_propio: sinPropio ? { sin_datos: true, mensaje_sin_datos: SIN_PERSONAL_PROPIO } : { sin_datos: false, mensaje_sin_datos: null },
    notas: [
      'Una programación se considera pendiente mientras no tenga una ejecución con inicio real',
      'Cualquier retraso del fin real frente al fin previsto cuenta como desviación',
    ],
  }
}

/** `GET programado-ejecutado/` simulado. */
export function simularProgramadoEjecutado(consulta: ConsultaProgramadoEjecutado, signal?: AbortSignal) {
  return responderSimulado(() => calcularProgramadoEjecutado(consulta), { signal })
}

/** Catálogos simulados de los filtros: los 4 servicios y los espacios de demo. */
export function simularCatalogoComparacion(signal?: AbortSignal) {
  return responderSimulado<CatalogoComparacion>(
    () => ({ tipos_servicio: SERVICIOS.map(({ id, nombre }) => ({ id, nombre })), espacios: ESPACIOS, completo: true }),
    { signal },
  )
}
