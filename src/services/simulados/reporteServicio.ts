/**
 * Datos simulados de RF-REP-008 (reporte por servicio tercerizado), solo con `VITE_DATOS_SIMULADOS=true`.
 * Unas 30 atenciones ficticias de los últimos 4 meses (contadas desde hoy en Lima). El reporte se calcula con el
 * servicio, el proveedor, el contrato y el periodo pedidos, como lo haría el backend.
 *
 * Escenarios con `?simular=`:
 * - `vacio`: el periodo sin atenciones (`sin_datos`);
 * - `datos-insuficientes`: la conformidad «no disponible», como llega hoy del backend (sin `ConformidadAtencion`);
 * - `error`, `sin-permiso` y `sin-sesion`: los genéricos de `simulacion.ts`.
 */
import { ErrorApi } from '../api/cliente'
import type {
  CatalogoServicios,
  ConsultaReporteServicio,
  ElementoAtendido,
  FilaAtencionServicio,
  ResultadoReporteServicio,
} from '@/types/reportesGestion'
import { hoyLima } from '@/utils/instanteLima'
import { ESTADOS_EJECUTADOS as EJECUTADAS, ESTADOS_PENDIENTES as PENDIENTES } from '@/utils/reporteServicio'
import { escenarioSimulado, responderSimulado } from './simulacion'

const CORTE = 1
const FITOSANITARIO = 2
const PODA_MAYOR = 3
const PODA_ALTURA = 4

const TIPOS = [
  { id: CORTE, nombre: 'Corte de césped', unidad: 'm²' },
  { id: FITOSANITARIO, nombre: 'Control fitosanitario', unidad: 'ejemplares' },
  { id: PODA_MAYOR, nombre: 'Poda mayor programada', unidad: 'ejemplares' },
  { id: PODA_ALTURA, nombre: 'Poda de altura a demanda', unidad: 'ejemplares' },
]

const PROVEEDORES = [
  { id: 101, nombre: 'Verde Campus S.A.C. (demo)' },
  { id: 102, nombre: 'Arbolistas del Sur E.I.R.L. (demo)' },
]

const CONTRATOS = [
  { id: 201, codigo: 'CT-2026-014', proveedor_id: 101, tipos: [CORTE, FITOSANITARIO], vigencia_desde: '2026-03-01', vigencia_hasta: '2027-02-28' },
  { id: 202, codigo: 'CT-2026-021', proveedor_id: 102, tipos: [FITOSANITARIO, PODA_MAYOR, PODA_ALTURA], vigencia_desde: '2026-05-01', vigencia_hasta: null },
]

/** Atención simulada: [tipo, contrato, días atrás, horas, estado, extraordinaria, espacio, ejemplar, metrado, documentos, riesgo, especie o plaga, fuera de plazo]. */
type Semilla = [number, number, number, number, string, boolean, string, string | null, number, number, boolean, string | null, boolean?]

const SEMILLAS: Semilla[] = [
  [CORTE, 201, 0, 0, 'Requerimiento registrado', false, 'Jardín Central', null, 3200, 1, false, null],
  [CORTE, 201, 2, 5, 'En ejecución', false, 'Tontódromo', null, 2800, 1, false, null],
  [CORTE, 201, 6, 4, 'Ejecutado pendiente de reporte', false, 'Explanada de Ciencias', null, 4100, 0, false, null],
  [CORTE, 201, 12, 6, 'Reporte adjunto', false, 'Jardín Central', null, 3200, 2, false, null, true],
  [CORTE, 201, 20, 5, 'Conforme / cerrado', false, 'Plaza de Letras', null, 2500, 3, false, null],
  [CORTE, 201, 33, 4, 'Conforme / cerrado', false, 'Tontódromo', null, 2800, 2, false, null],
  [CORTE, 201, 41, 7, 'Observado', true, 'Jardín de Ingeniería', null, 3600, 2, false, null, true],
  [CORTE, 201, 55, 5, 'Conforme / cerrado', false, 'Explanada de Ciencias', null, 4100, 2, false, null],
  [CORTE, 201, 70, 6, 'Conforme / cerrado', false, 'Jardín Central', null, 3200, 1, false, null],
  [CORTE, 201, 96, 4, 'Conforme / cerrado', false, 'Plaza de Letras', null, 2500, 2, false, null],
  [FITOSANITARIO, 201, 1, 0, 'OC referenciada', false, 'Jardín Central', 'EJ-0142', 8, 1, false, 'Queresa'],
  [FITOSANITARIO, 201, 4, 3, 'Reporte adjunto', false, 'Bosque de Educación', 'EJ-0310', 12, 2, false, 'Mosca blanca'],
  [FITOSANITARIO, 202, 9, 4, 'Ejecutado pendiente de reporte', true, 'Tontódromo', 'EJ-0077', 6, 0, false, 'Queresa'],
  [FITOSANITARIO, 201, 17, 3, 'Conforme / cerrado', false, 'Explanada de Ciencias', 'EJ-0205', 15, 3, false, 'Pulgón'],
  [FITOSANITARIO, 202, 26, 5, 'Observado', false, 'Jardín de Ingeniería', 'EJ-0418', 10, 1, false, 'Mosca blanca'],
  [FITOSANITARIO, 201, 38, 3, 'Conforme / cerrado', false, 'Plaza de Letras', 'EJ-0133', 9, 2, false, 'Arañita roja'],
  [FITOSANITARIO, 202, 52, 4, 'Conforme / cerrado', false, 'Jardín Central', 'EJ-0142', 20, 2, false, 'Queresa'],
  [FITOSANITARIO, 201, 77, 3, 'Conforme / cerrado', true, 'Bosque de Educación', 'EJ-0311', 4, 1, false, 'Pulgón'],
  [FITOSANITARIO, 202, 104, 4, 'Conforme / cerrado', false, 'Tontódromo', 'EJ-0080', 11, 2, false, 'Mosca blanca'],
  [PODA_MAYOR, 202, 3, 6, 'En ejecución', false, 'Jardín Central', 'EJ-0019', 3, 1, false, 'Ficus'],
  [PODA_MAYOR, 202, 15, 8, 'Reporte adjunto', false, 'Explanada de Ciencias', 'EJ-0250', 5, 2, false, 'Molle'],
  [PODA_MAYOR, 202, 29, 7, 'Conforme / cerrado', false, 'Plaza de Letras', 'EJ-0161', 2, 2, false, 'Palmera real'],
  [PODA_MAYOR, 202, 47, 9, 'Observado', false, 'Tontódromo', 'EJ-0091', 4, 1, false, 'Ficus'],
  [PODA_MAYOR, 202, 66, 6, 'Conforme / cerrado', false, 'Jardín de Ingeniería', 'EJ-0402', 6, 2, false, 'Jacarandá'],
  [PODA_MAYOR, 202, 88, 8, 'Conforme / cerrado', false, 'Bosque de Educación', 'EJ-0322', 3, 1, false, 'Molle'],
  [PODA_ALTURA, 202, 1, 0, 'Requerimiento registrado', true, 'Explanada de Ciencias', 'EJ-0255', 1, 0, true, 'Palmera real'],
  [PODA_ALTURA, 202, 8, 5, 'Ejecutado pendiente de reporte', true, 'Jardín Central', 'EJ-0021', 2, 1, true, 'Ficus'],
  [PODA_ALTURA, 202, 24, 6, 'Conforme / cerrado', true, 'Tontódromo', 'EJ-0093', 1, 2, false, 'Eucalipto'],
  [PODA_ALTURA, 202, 59, 4, 'Conforme / cerrado', true, 'Plaza de Letras', 'EJ-0165', 2, 1, false, 'Palmera real'],
  [PODA_ALTURA, 202, 92, 5, 'Observado', true, 'Jardín de Ingeniería', 'EJ-0405', 1, 2, false, 'Molle'],
]

interface AtencionSimulada {
  tipo: number
  contrato: number
  fecha: string
  horas: number
  elemento: string | null
  fuera_de_plazo: boolean
  fila: FilaAtencionServicio
}

/** Fecha (`AAAA-MM-DD`) `dias` antes de `hoy`. */
function restarDias(hoy: string, dias: number): string {
  const [anio, mes, dia] = hoy.split('-').map(Number)
  return new Date(Date.UTC(anio, mes - 1, dia - dias)).toISOString().slice(0, 10)
}

function crearAtenciones(hoy: string): AtencionSimulada[] {
  return SEMILLAS.map(([tipo, contrato, dias, horas, estado, extra, espacio, ejemplar, metrado, documentos, riesgo, elemento, fuera], i) => {
    const fecha = restarDias(hoy, dias)
    const iniciada = horas > 0
    const terminada = EJECUTADAS.has(estado)
    return {
      tipo,
      contrato,
      fecha,
      horas,
      elemento,
      fuera_de_plazo: fuera === true,
      fila: {
        id: 9000 + i,
        codigo: `AT-2026-${String(410 + i).padStart(4, '0')}`,
        clase: extra ? 'Extraordinaria' : 'Programada',
        estado,
        etiqueta_estado: estado,
        espacio,
        ejemplar_codigo: ejemplar,
        fecha_hora_inicio: iniciada ? `${fecha}T08:00:00-05:00` : null,
        fecha_hora_fin: iniciada && terminada ? `${fecha}T${String(8 + horas).padStart(2, '0')}:00:00-05:00` : null,
        metrado: String(metrado),
        unidad: TIPOS.find((t) => t.id === tipo)?.unidad ?? null,
        conformidad: estado === 'Conforme / cerrado' ? 'Conforme' : estado === 'Observado' ? 'Observada' : null,
        documentos,
        especies_plagas: elemento ? [elemento] : [],
        con_evidencia: documentos > 0,
        es_riesgo: riesgo,
      },
    }
  })
}

const sinDatos = (mensaje: string) => ({ sin_datos: true, mensaje_sin_datos: mensaje })
const conDatos = { sin_datos: false, mensaje_sin_datos: null }
const decimal = (valor: number) => String(Math.round(valor * 10) / 10)
const suma = (valores: number[]) => valores.reduce((total, v) => total + v, 0)

const MENSAJE_VACIO = 'No hay atenciones de este servicio en el periodo seleccionado'

/** Reporte calculado a partir de la consulta (exportado para las pruebas). */
export function calcularReporteServicio(consulta: ConsultaReporteServicio, hoy: string = hoyLima()): ResultadoReporteServicio {
  const tipo = TIPOS.find((t) => t.id === consulta.tipo_servicio_id)
  if (!tipo) throw new ErrorApi(400, 'parametro-invalido', 'Elige un tipo de servicio tercerizado', { tipo_servicio_id: ['No existe'] })
  const escenario = escenarioSimulado()
  const proveedorDe = (contrato: number) => CONTRATOS.find((c) => c.id === contrato)?.proveedor_id
  const elegidas = crearAtenciones(hoy).filter(
    (a) =>
      escenario !== 'vacio' &&
      a.tipo === tipo.id &&
      a.fecha >= consulta.desde &&
      a.fecha <= consulta.hasta &&
      (consulta.proveedor_id === undefined || proveedorDe(a.contrato) === consulta.proveedor_id) &&
      (consulta.contrato_id === undefined || a.contrato === consulta.contrato_id),
  )
  const filas = elegidas.map((a) => a.fila)
  const ejecutadas = elegidas.filter((a) => EJECUTADAS.has(a.fila.estado))
  const metrado = (lista: AtencionSimulada[]) => suma(lista.map((a) => Number(a.fila.metrado)))

  const contratos = [...new Set(elegidas.map((a) => a.contrato))]
  const contrato = CONTRATOS.find((c) => c.id === (consulta.contrato_id ?? (contratos.length === 1 ? contratos[0] : undefined)))
  const proveedorId = consulta.proveedor_id ?? contrato?.proveedor_id
  const proveedor = PROVEEDORES.find((p) => p.id === proveedorId) ?? null

  const horas = suma(ejecutadas.map((a) => a.horas))
  const rendimiento =
    tipo.id !== CORTE
      ? { ...sinDatos('El registro de tiempos por ejemplar aún no está disponible'), horas_ejecucion: null, rendimiento_por_hora: null, unidad_rendimiento: null, duracion_media_horas: null, atenciones_fuera_de_plazo: null }
      : horas === 0
        ? { ...sinDatos('No hay atenciones ejecutadas con hora de inicio y fin en el periodo'), horas_ejecucion: null, rendimiento_por_hora: null, unidad_rendimiento: null, duracion_media_horas: null, atenciones_fuera_de_plazo: null }
        : {
            ...conDatos,
            horas_ejecucion: decimal(horas),
            rendimiento_por_hora: decimal(metrado(ejecutadas) / horas),
            unidad_rendimiento: 'm²/h',
            duracion_media_horas: decimal(horas / ejecutadas.length),
            atenciones_fuera_de_plazo: ejecutadas.filter((a) => a.fuera_de_plazo).length,
          }

  const elementos = new Map<string, ElementoAtendido>()
  for (const a of elegidas) {
    if (!a.elemento) continue
    const actual = elementos.get(a.elemento) ?? { tipo: tipo.id === FITOSANITARIO ? 'Plaga' : 'Especie', nombre: a.elemento, atenciones: 0, ejemplares: 0 }
    elementos.set(a.elemento, { ...actual, atenciones: actual.atenciones + 1, ejemplares: (actual.ejemplares ?? 0) + Number(a.fila.metrado) })
  }
  const listaElementos = [...elementos.values()].sort((x, y) => y.atenciones - x.atenciones || x.nombre.localeCompare(y.nombre, 'es'))

  const cuenta = (estado: string) => filas.filter((f) => f.estado === estado).length
  const total = filas.length

  return {
    periodo: { desde: consulta.desde, hasta: consulta.hasta },
    filtros_aplicados: { tipo_servicio_id: tipo.id, proveedor_id: consulta.proveedor_id ?? null, contrato_id: consulta.contrato_id ?? null },
    generado_en: new Date().toISOString(),
    ...(total === 0 ? sinDatos(MENSAJE_VACIO) : conDatos),
    servicio: {
      tipo_servicio_id: tipo.id,
      nombre: tipo.nombre,
      proveedor,
      contrato: contrato ? { id: contrato.id, codigo: contrato.codigo, vigencia_desde: contrato.vigencia_desde, vigencia_hasta: contrato.vigencia_hasta } : null,
    },
    avance: {
      ...conDatos,
      programadas: filas.filter((f) => f.clase === 'Programada').length,
      extraordinarias: filas.filter((f) => f.clase === 'Extraordinaria').length,
      ejecutadas: ejecutadas.length,
      en_ejecucion: cuenta('En ejecución'),
      pendientes: filas.filter((f) => PENDIENTES.has(f.estado)).length,
      porcentaje_avance: total > 0 ? decimal((ejecutadas.length / total) * 100) : null,
      metrado_previsto: total > 0 ? String(metrado(elegidas)) : null,
      metrado_ejecutado: total > 0 ? String(metrado(ejecutadas)) : null,
      unidad_metrado: tipo.unidad,
    },
    rendimiento,
    especies_plagas:
      tipo.id === CORTE
        ? { ...sinDatos('Este servicio no atiende ejemplares'), elementos: [] }
        : listaElementos.length === 0
          ? { ...sinDatos('No hay especies ni plagas registradas en el periodo'), elementos: [] }
          : { ...conDatos, elementos: listaElementos },
    conformidad:
      escenario === 'datos-insuficientes'
        ? { ...sinDatos('La revisión de conformidad aún no se registra en el sistema'), conformes: 0, observadas: 0, pendientes_de_revision: 0, sin_reporte_proveedor: 0, subsanaciones_abiertas: 0 }
        : {
            ...conDatos,
            conformes: cuenta('Conforme / cerrado'),
            observadas: cuenta('Observado'),
            pendientes_de_revision: cuenta('Reporte adjunto'),
            sin_reporte_proveedor: cuenta('Ejecutado pendiente de reporte'),
            subsanaciones_abiertas: cuenta('Observado'),
          },
    atenciones: filas,
    atenciones_sin_evidencia: filas.filter((f) => !f.con_evidencia).length,
    notas: [
      'La conformidad se calcula con las revisiones registradas por la sección',
      'El avance cuenta como ejecutadas las atenciones con fin registrado, tengan o no reporte del proveedor',
    ],
  }
}

/** `GET servicios-tercerizados/` simulado. */
export function simularReporteServicio(consulta: ConsultaReporteServicio, signal?: AbortSignal) {
  return responderSimulado(() => calcularReporteServicio(consulta), { signal })
}

/** Catálogos simulados de los filtros (tipos tercerizados y proveedores de demo). */
export function simularCatalogoServicios(signal?: AbortSignal) {
  return responderSimulado<CatalogoServicios>(
    () => ({
      tipos_servicio: TIPOS.map(({ id, nombre }) => ({ id, nombre })),
      proveedores: PROVEEDORES,
      completo: true,
    }),
    { signal },
  )
}
