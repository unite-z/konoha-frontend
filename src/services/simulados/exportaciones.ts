/**
 * Datos simulados de RF-REP-009 (exportaciones), solo con `VITE_DATOS_SIMULADOS=true`.
 *
 * - Tipos exportables: los del Modelo BD; la matriz de incidencias, no disponible.
 * - Historial: un almacén en memoria con 8 reportes ficticios (se pierde al recargar).
 * - Generar: valida el periodo y crea un `ReporteGenerado` con filas calculadas a partir de los parámetros.
 * - Descargar: NO genera un PDF ni un Excel real en el navegador. Entrega un CSV de texto con la cabecera de
 *   metadatos (tipo, periodo, filtros, autor, fecha y «DATOS SIMULADOS») y unas filas de ejemplo.
 *
 * Escenarios con `?simular=`:
 * - `volumen-excedido`: con PDF, 422 «volumen-excedido» (A1);
 * - `vacio`: 422 «sin-datos» al generar (A2) y el historial vacío;
 * - `error`, `sin-permiso` y `sin-sesion`: los genéricos de `simulacion.ts`.
 */
import { ErrorApi } from '../api/cliente'
import { guardarArchivo } from '../api/clienteReportesGestion'
import type { Paginado } from '@/types/comun'
import type {
  ConsultaExportaciones,
  FormatoSalida,
  ParametrosExportacion,
  ReporteGenerado,
  SolicitudExportacion,
  TipoExportable,
  TipoReporte,
} from '@/types/exportaciones'
import { nombreArchivoSimulado, textoPeriodo } from '@/utils/exportaciones'
import { formatearFechaHora } from '@/utils/formato'
import { hoyLima } from '@/utils/instanteLima'
import { crearAlmacenSimulado, escenarioSimulado, responderSimulado } from './simulacion'

const POR_PAGINA = 25

const TIPOS: TipoExportable[] = [
  {
    tipo: 'GestionOSG',
    nombre: 'Reporte general de gestión para la OSG',
    descripcion: 'Indicadores del panel, cumplimiento de tercerizados, material vegetal y atenciones por espacio del mes',
    formatos: ['PDF', 'Excel'],
    filtros: ['mes'],
    disponible: true,
    motivo_no_disponible: null,
    limite_filas: { PDF: 5000 },
  },
  {
    tipo: 'ServicioTercerizado',
    nombre: 'Reporte por servicio tercerizado',
    descripcion: 'Avance, rendimiento, especies o plagas y conformidad de un servicio en un periodo',
    formatos: ['PDF', 'Excel'],
    filtros: ['periodo', 'tipo_servicio_id', 'proveedor_id'],
    disponible: true,
    motivo_no_disponible: null,
    limite_filas: { PDF: 5000 },
  },
  {
    tipo: 'MaterialVegetal',
    nombre: 'Consumo y propagación de material vegetal',
    descripcion: 'Material vegetal e insumos consumidos, propagados y trasladados en un mes',
    formatos: ['PDF', 'Excel'],
    filtros: ['mes', 'area_verde_id'],
    disponible: true,
    motivo_no_disponible: null,
    limite_filas: { PDF: 5000 },
  },
  {
    tipo: 'DistribucionPersonal',
    nombre: 'Distribución del personal',
    descripcion: 'Personal por cuadrilla, actividad, espacio y jornada en un periodo',
    formatos: ['Excel'],
    filtros: ['periodo'],
    disponible: true,
    motivo_no_disponible: null,
    limite_filas: null,
  },
  {
    tipo: 'MatrizIncidencias',
    nombre: 'Matriz de incidencias',
    descripcion: 'Incidencias del periodo por espacio, tipo y estado',
    formatos: ['PDF', 'Excel'],
    filtros: ['periodo'],
    disponible: false,
    motivo_no_disponible: 'El registro de incidencias aún no está disponible',
    limite_filas: null,
  },
]

const USUARIOS = ['Jefatura de sección (demo)', 'Ingeniería de campo (demo)']

/** Fecha (`AAAA-MM-DD`) `dias` antes de hoy en Lima. */
function haceDias(dias: number): string {
  const [anio, mes, dia] = hoyLima().split('-').map(Number)
  return new Date(Date.UTC(anio, mes - 1, dia - dias)).toISOString().slice(0, 10)
}

/** Filas deterministas: dependen solo de los parámetros. */
function filasDe(parametros: ParametrosExportacion): number {
  const texto = JSON.stringify(parametros)
  let suma = 0
  for (const caracter of texto) suma = (suma * 31 + caracter.charCodeAt(0)) % 9973
  return 40 + (suma % 900)
}

function resumen(tipo: TipoExportable, parametros: ParametrosExportacion): string {
  const partes = [
    textoPeriodo(parametros),
    parametros.tipo_servicio_id !== undefined && `Servicio n.º ${parametros.tipo_servicio_id}`,
    parametros.proveedor_id !== undefined && `Proveedor n.º ${parametros.proveedor_id}`,
    parametros.area_verde_id !== undefined && `Espacio n.º ${parametros.area_verde_id}`,
  ]
  return partes.filter(Boolean).join(' · ') || tipo.nombre
}

function crearReporte(id: number, solicitud: SolicitudExportacion, usuario: string, fechaHora: string): ReporteGenerado {
  const tipo = TIPOS.find((t) => t.tipo === solicitud.tipo) ?? TIPOS[0]
  const filas = filasDe(solicitud.parametros)
  const extension = solicitud.formato === 'PDF' ? 'pdf' : 'xlsx'
  return {
    id,
    tipo: tipo.tipo,
    etiqueta_tipo: tipo.nombre,
    formato: solicitud.formato,
    parametros: solicitud.parametros,
    resumen_parametros: resumen(tipo, solicitud.parametros),
    usuario,
    fecha_hora: fechaHora,
    archivo: { id: 5000 + id, nombre: `${tipo.tipo}-${id}.${extension}`, tamano_bytes: filas * (extension === 'pdf' ? 310 : 95) },
    filas,
  }
}

const mesAtras = (meses: number) => haceDias(meses * 30).slice(0, 7)

/** Historial inicial: [id, tipo, formato, parámetros, días atrás]. */
const SEMILLAS: [number, TipoReporte, FormatoSalida, ParametrosExportacion, number][] = [
  [1, 'GestionOSG', 'PDF', { mes: mesAtras(3) }, 88],
  [2, 'MaterialVegetal', 'Excel', { mes: mesAtras(3) }, 80],
  [3, 'ServicioTercerizado', 'PDF', { desde: haceDias(75), hasta: haceDias(60), tipo_servicio_id: 1 }, 59],
  [4, 'GestionOSG', 'Excel', { mes: mesAtras(2) }, 57],
  [5, 'DistribucionPersonal', 'Excel', { desde: haceDias(50), hasta: haceDias(44) }, 43],
  [6, 'GestionOSG', 'PDF', { mes: mesAtras(1) }, 28],
  [7, 'ServicioTercerizado', 'Excel', { desde: haceDias(30), hasta: haceDias(1), tipo_servicio_id: 2, proveedor_id: 102 }, 9],
  [8, 'MaterialVegetal', 'PDF', { mes: mesAtras(1), area_verde_id: 3 }, 2],
]

const almacen = crearAlmacenSimulado(
  SEMILLAS.map(([id, tipo, formato, parametros, dias], i) =>
    crearReporte(id, { tipo, formato, parametros }, USUARIOS[i % USUARIOS.length], `${haceDias(dias)}T10:${String(10 + i).padStart(2, '0')}:00-05:00`),
  ),
)

/** `GET exportaciones/tipos/` simulado. */
export function simularTiposExportables(signal?: AbortSignal) {
  return responderSimulado(() => TIPOS, { signal })
}

/** `GET exportaciones/` simulado: del más reciente al más antiguo, 25 por página. */
export function simularListarExportaciones(consulta: ConsultaExportaciones, signal?: AbortSignal) {
  return responderSimulado<Paginado<ReporteGenerado>>(() => {
    const todos =
      escenarioSimulado() === 'vacio'
        ? []
        : almacen
            .listar()
            .filter((r) => !consulta.tipo || r.tipo === consulta.tipo)
            .sort((a, b) => b.fecha_hora.localeCompare(a.fecha_hora) || b.id - a.id)
    const pagina = Math.max(1, consulta.page ?? 1)
    return {
      count: todos.length,
      next: pagina * POR_PAGINA < todos.length ? `?page=${pagina + 1}` : null,
      previous: pagina > 1 ? `?page=${pagina - 1}` : null,
      results: todos.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
    }
  }, { signal })
}

/** Valida la solicitud como el backend y, sin escenario de error, guarda el reporte (exportado para las pruebas). */
export function generarSimulado(solicitud: SolicitudExportacion, ahora: Date = new Date()): ReporteGenerado {
  const tipo = TIPOS.find((t) => t.tipo === solicitud.tipo)
  if (!tipo || !tipo.disponible) {
    throw new ErrorApi(400, 'tipo-no-disponible', tipo?.motivo_no_disponible ?? 'Elige un tipo de reporte exportable')
  }
  if (!tipo.formatos.includes(solicitud.formato)) {
    throw new ErrorApi(400, 'formato-no-permitido', 'Este reporte no se puede exportar en ese formato', { formato: ['No permitido'] })
  }
  const { mes, desde, hasta } = solicitud.parametros
  if (tipo.filtros.includes('mes') && !mes) {
    throw new ErrorApi(400, 'parametro-invalido', 'Indica el mes del reporte', { mes: ['Indica el mes del reporte (mes), con el formato AAAA-MM'] })
  }
  if (tipo.filtros.includes('periodo') && (!desde || !hasta)) {
    throw new ErrorApi(400, 'periodo-invalido', 'Indica el periodo del reporte', { desde: ['Indica la fecha de inicio del periodo (desde)'] })
  }
  const escenario = escenarioSimulado()
  if (escenario === 'vacio') throw new ErrorApi(422, 'sin-datos', 'No hay datos para exportar con estos filtros')
  if (escenario === 'volumen-excedido' && solicitud.formato === 'PDF') {
    throw new ErrorApi(
      422,
      'volumen-excedido',
      'El reporte tiene 7 250 filas y el PDF admite hasta 5 000. Acota el periodo o los filtros, o exporta a Excel',
    )
  }
  return almacen.guardar(crearReporte(almacen.siguienteId(), solicitud, USUARIOS[0], ahora.toISOString()))
}

/** `POST exportaciones/` simulado. */
export function simularGenerarExportacion(solicitud: SolicitudExportacion, signal?: AbortSignal) {
  return responderSimulado(() => generarSimulado(solicitud), { signal, demoraMs: 900 })
}

/** Contenido del CSV simulado: metadatos de generación y filas de ejemplo (exportado para las pruebas). */
export function csvSimulado(reporte: ReporteGenerado): string {
  const celda = (valor: string) => `"${valor.replaceAll('"', '""')}"`
  const lineas = [
    ['DATOS SIMULADOS', 'Archivo de ejemplo: no es el reporte real'],
    ['Tipo', reporte.etiqueta_tipo],
    ['Periodo y filtros', reporte.resumen_parametros],
    ['Formato solicitado', reporte.formato],
    ['Generado por', reporte.usuario],
    ['Fecha y hora', formatearFechaHora(reporte.fecha_hora)],
    ['Filas', String(reporte.filas)],
    [],
    ['Espacio', 'Concepto', 'Valor'],
    ['Jardín Central', 'Atenciones', '12'],
    ['Tontódromo', 'Atenciones', '8'],
    ['Explanada de Ciencias', 'Atenciones', '5'],
  ]
  return lineas.map((fila) => fila.map(celda).join(';')).join('\r\n')
}

/** Descarga simulada: un CSV de texto con el mismo enlace temporal que la descarga real. */
export async function simularDescargaExportacion(reporte: ReporteGenerado, signal?: AbortSignal): Promise<void> {
  const contenido = await responderSimulado(() => csvSimulado(reporte), { signal, demoraMs: 300 })
  // BOM para que las hojas de cálculo lean bien las tildes.
  guardarArchivo(new Blob(['﻿', contenido], { type: 'text/csv;charset=utf-8' }), nombreArchivoSimulado(reporte))
}
