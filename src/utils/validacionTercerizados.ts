/**
 * Validaciones de los formularios de MOD-05 (funciones puras, sin React).
 *
 * Replican las reglas del back-end para avisar antes de enviar; el back-end vuelve a validarlo todo y su
 * respuesta es la que vale. Los mensajes dicen qué hacer (Guía Web 7).
 */
import { esFuturo, esLocalValido, instanteALocalLima, milisegundos } from './instanteLima'

/** Largo máximo del número de OC (`numero_orden_compra`). */
export const LARGO_MAXIMO_OC = 30

export interface ErroresOrdenCompra {
  numero?: string
  motivo?: string
}

/**
 * RF-SER-004. `tieneOc`: la atención ya tiene una OC (es una corrección y exige motivo).
 * `actual`: número vigente, para avisar si no cambia.
 */
export function validarOrdenCompra(
  valores: { numero: string; motivo: string },
  tieneOc: boolean,
  actual = '',
): ErroresOrdenCompra {
  const errores: ErroresOrdenCompra = {}
  const numero = valores.numero.trim()
  if (!numero) errores.numero = 'Escribe el número de la orden de compra emitida por Logística'
  else if (numero.length > LARGO_MAXIMO_OC) errores.numero = `Usa como máximo ${LARGO_MAXIMO_OC} caracteres`
  else if (tieneOc && numero === actual.trim()) errores.numero = 'Escribe el número corregido; es igual al registrado'
  if (tieneOc && !valores.motivo.trim()) errores.motivo = 'Explica por qué se corrige la orden de compra'
  return errores
}

export type ModoEjecucion = 'inicio' | 'fin'

export interface ResultadoEjecucion {
  /** Impide enviar. */
  error?: string
  /** No impide enviar, pero hay que mostrarla. */
  advertencia?: string
}

/**
 * RF-SER-005. `valor`: campo `datetime-local` en hora de Lima. `inicio`: instante de inicio registrado
 * (solo para el fin).
 */
export function validarEjecucion(
  modo: ModoEjecucion,
  valor: string,
  inicio: string | null = null,
  ahora: Date = new Date(),
): ResultadoEjecucion {
  const nombre = modo === 'inicio' ? 'inicio' : 'fin'
  if (!valor) return { error: `Indica la fecha y la hora de ${nombre} del servicio` }
  if (!esLocalValido(valor)) return { error: 'Escribe una fecha y una hora válidas' }
  if (modo === 'fin' && inicio) {
    const desde = milisegundos(inicio)
    // Se compara al minuto: el campo no tiene segundos.
    const inicioLocal = instanteALocalLima(inicio)
    if (Number.isFinite(desde) && inicioLocal && milisegundos(valor) < milisegundos(inicioLocal)) {
      return { error: 'El fin no puede ser anterior al inicio registrado. Revisa la fecha y la hora' }
    }
  }
  if (esFuturo(valor, ahora)) {
    return { advertencia: 'La fecha y la hora son posteriores al momento actual. Confírmalas antes de registrar' }
  }
  return {}
}

// --- RF-SER-006: reporte y documentación ----------------------------------------------------------------

/** Extensiones admitidas por el back-end (PDF, JPEG, PNG, DOCX y XLSX). */
export const EXTENSIONES_DOCUMENTO = ['.pdf', '.jpg', '.jpeg', '.png', '.docx', '.xlsx'] as const

/** Valor de `accept` del selector de archivos. */
export const ACEPTA_DOCUMENTOS = EXTENSIONES_DOCUMENTO.join(',')

/** Largo máximo de la descripción de un documento. */
export const LARGO_MAXIMO_DESCRIPCION_DOCUMENTO = 200

/** Largo máximo del nombre de archivo que guarda el back-end. */
export const LARGO_MAXIMO_NOMBRE_ARCHIVO = 200

export interface DocumentoBorrador {
  /** Clave local de la fila. */
  clave: string
  archivo: { name: string; size: number }
  categoria: string
  /** Id del alcance como texto (valor del selector); vacío si no aplica. */
  alcance_id: string
  descripcion: string
}

export interface ErroresReporte {
  fecha?: string
  /** Error general del conjunto (sin archivos, sin informe final). */
  general?: string
  porDocumento: Record<string, { archivo?: string; categoria?: string; alcance?: string; descripcion?: string }>
}

function extension(nombre: string): string {
  const punto = nombre.lastIndexOf('.')
  return punto < 0 ? '' : nombre.slice(punto).toLowerCase()
}

/** Problema del archivo en sí (tipo, vacío o nombre), o `undefined` si se puede enviar. */
export function problemaArchivo(archivo: { name: string; size: number }): string | undefined {
  if (!(EXTENSIONES_DOCUMENTO as readonly string[]).includes(extension(archivo.name))) {
    return 'Tipo de archivo no admitido. Usa PDF, JPEG, PNG, DOCX o XLSX'
  }
  if (archivo.size <= 0) return 'El archivo está vacío. Elige otro'
  if (archivo.name.length > LARGO_MAXIMO_NOMBRE_ARCHIVO) {
    return `El nombre del archivo supera ${LARGO_MAXIMO_NOMBRE_ARCHIVO} caracteres. Renómbralo antes de adjuntarlo`
  }
  return undefined
}

/**
 * Valida una revisión del reporte. `finLima`: fecha de fin del servicio en Lima (`AAAA-MM-DD`); la recepción
 * del informe final no puede ser anterior.
 */
export function validarReporte(
  valores: { fecha: string; documentos: DocumentoBorrador[] },
  finLima: string | null,
): ErroresReporte {
  const errores: ErroresReporte = { porDocumento: {} }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valores.fecha)) errores.fecha = 'Indica la fecha en que se recibió el informe'
  else if (finLima && valores.fecha < finLima) {
    errores.fecha = 'La recepción no puede ser anterior al fin del servicio. Revisa la fecha'
  }
  if (valores.documentos.length === 0) errores.general = 'Adjunta al menos el informe final del proveedor'
  else if (!valores.documentos.some((d) => d.categoria === 'InformeFinal')) {
    errores.general = 'Cada revisión debe incluir un documento con la categoría «Informe final»'
  }
  for (const d of valores.documentos) {
    const propios: ErroresReporte['porDocumento'][string] = {}
    const problema = problemaArchivo(d.archivo)
    if (problema) propios.archivo = problema
    if (!d.categoria) propios.categoria = 'Elige la categoría del documento'
    if (d.categoria === 'EvidenciaEspacio' && !d.alcance_id) propios.alcance = 'Indica el espacio o ejemplar de la evidencia'
    if (d.descripcion.trim().length > LARGO_MAXIMO_DESCRIPCION_DOCUMENTO) {
      propios.descripcion = `Usa como máximo ${LARGO_MAXIMO_DESCRIPCION_DOCUMENTO} caracteres`
    }
    if (Object.keys(propios).length > 0) errores.porDocumento[d.clave] = propios
  }
  return errores
}

export function hayErroresReporte(errores: ErroresReporte): boolean {
  return Boolean(errores.fecha || errores.general) || Object.keys(errores.porDocumento).length > 0
}

/** Categoría propuesta por el nombre del archivo (el usuario la confirma). */
export function categoriaSugerida(nombre: string): string {
  const n = nombre.toLowerCase()
  if (/informe|reporte/.test(n)) return 'InformeFinal'
  if (/metrado/.test(n)) return 'Metrado'
  if (/ruta/.test(n)) return 'RutaRecorrida'
  if (/ficha/.test(n)) return 'FichasDiarias'
  if (/charla/.test(n)) return 'CharlasTecnicas'
  if (/plaga/.test(n)) return 'PlagasAtendidas'
  if (/producto/.test(n)) return 'ProductosAplicados'
  if (/planta/.test(n)) return 'PlantasAtendidas'
  return ''
}

// --- RF-SER-011: origen y acuerdo de la unidad ----------------------------------------------------------

/** Largo máximo del nombre de una unidad provisional. */
export const LARGO_MAXIMO_UNIDAD_PROVISIONAL = 150

export interface ValoresOrigen {
  origen: string
  unidadModo: 'existente' | 'provisional'
  unidadId: number | null
  unidadProvisional: string
  motivo: string
}

export interface ErroresOrigen {
  origen?: string
  unidad?: string
  unidadProvisional?: string
  motivo?: string
}

/**
 * Corrección del origen (antes del inicio). `actual`: origen y unidad registrados, para detectar que no cambió
 * nada. El motivo queda en la auditoría.
 */
export function validarOrigen(v: ValoresOrigen, actual: { origen: string; unidadId: number | null }): ErroresOrigen {
  const errores: ErroresOrigen = {}
  if (!v.origen) errores.origen = 'Indica el origen de la atención'
  if (v.origen === 'SolicitudUnidad') {
    if (v.unidadModo === 'existente' && !v.unidadId) errores.unidad = 'Selecciona la unidad que solicita el trabajo'
    if (v.unidadModo === 'provisional') {
      const nombre = v.unidadProvisional.trim()
      if (!nombre) errores.unidadProvisional = 'Escribe el nombre de la unidad que solicita el trabajo'
      else if (nombre.length > LARGO_MAXIMO_UNIDAD_PROVISIONAL) {
        errores.unidadProvisional = `Usa como máximo ${LARGO_MAXIMO_UNIDAD_PROVISIONAL} caracteres`
      }
    }
  }
  const mismaUnidad = v.origen !== 'SolicitudUnidad' || (v.unidadModo === 'existente' && v.unidadId === actual.unidadId)
  if (!errores.origen && v.origen === actual.origen && mismaUnidad) {
    errores.origen = 'El origen y la unidad son los registrados. Cámbialos o cierra sin guardar'
  }
  if (!v.motivo.trim()) errores.motivo = 'Explica por qué se corrige el origen'
  return errores
}

export type RespuestaUnidad = 'pendiente' | 'acuerdo' | 'desacuerdo'

export interface ValoresAcuerdo {
  respuesta: RespuestaUnidad
  fecha: string
  comentarios: string
}

export interface ErroresAcuerdo {
  respuesta?: string
  fecha?: string
  comentarios?: string
}

export function respuestaDeAcuerdo(acuerdo: boolean | null): RespuestaUnidad {
  return acuerdo === null ? 'pendiente' : acuerdo ? 'acuerdo' : 'desacuerdo'
}

/**
 * Acuerdo de la unidad (tras el fin). Comunicado: fecha obligatoria y no anterior al fin (Lima). Pendiente: sin
 * fecha. En desacuerdo se piden comentarios (qué observa la unidad). `actual`: lo registrado, para avisar si
 * no hay cambios.
 */
export function validarAcuerdo(
  v: ValoresAcuerdo,
  finLima: string | null,
  actual: { acuerdo: boolean | null; fecha: string | null; comentarios: string },
): ErroresAcuerdo {
  const errores: ErroresAcuerdo = {}
  if (v.respuesta !== 'pendiente') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.fecha)) errores.fecha = 'Indica la fecha en que la unidad comunicó su respuesta'
    else if (finLima && v.fecha < finLima) errores.fecha = 'La fecha no puede ser anterior al fin del servicio'
  }
  if (v.respuesta === 'desacuerdo' && !v.comentarios.trim()) {
    errores.comentarios = 'Anota qué observa la unidad sobre el trabajo realizado'
  }
  const sinCambios =
    respuestaDeAcuerdo(actual.acuerdo) === v.respuesta &&
    (v.respuesta === 'pendiente' || (actual.fecha ?? '') === v.fecha) &&
    actual.comentarios.trim() === v.comentarios.trim()
  if (sinCambios && !errores.fecha && !errores.comentarios) errores.respuesta = 'No hay cambios respecto a lo registrado'
  return errores
}
