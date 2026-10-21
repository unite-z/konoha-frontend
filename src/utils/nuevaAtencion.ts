/**
 * Borrador y validaciones del asistente «Nueva atención» (RF-SER-003 y RF-SER-011). Funciones puras.
 *
 * El borrador vive solo en la pantalla (no hay borradores en el servidor: TODO del plan). Las reglas
 * replican las del back-end para avisar antes de enviar; el back-end vuelve a validarlo todo.
 */
import type {
  AlcanceEntrada,
  Contrato,
  CrearAtencionEntrada,
  OrigenAtencion,
  UnidadInstitucional,
} from '../types/tercerizados'

/** Largo máximo del nombre de una unidad provisional (`unidad_provisional`). */
export const LARGO_MAXIMO_UNIDAD = 150

/** Metrado: hasta 10 enteros y 2 decimales (`@Digits(integer=10, fraction=2)`). */
const PATRON_METRADO = /^\d{1,10}(?:[.,]\d{1,2})?$/

export type TipoAlcance = 'area' | 'ejemplar'

/** Espacio o ejemplar elegido, con lo necesario para mostrarlo y enviarlo. */
export interface AlcanceSeleccionado {
  /** `area:3` o `ejemplar:12`: identifica el destino y evita duplicados. */
  clave: string
  tipo: TipoAlcance
  id: number
  /** Nombre del área o código del ejemplar. */
  etiqueta: string
  /** Información de apoyo (por ejemplo, el área del ejemplar). */
  detalle?: string
  /** Texto tal como lo escribe el usuario («1 250,50» se acepta como 1250.50). */
  metrado: string
  /** Id de la unidad de medida como texto (valor del selector); vacío si no hay metrado. */
  unidad_medida_id: string
}

export interface BorradorAtencion {
  contrato: Contrato | null
  descripcion: string
  es_riesgo: boolean
  origen: OrigenAtencion | ''
  /** Solo para «Solicitud de una unidad». */
  unidadModo: 'existente' | 'provisional'
  unidad: UnidadInstitucional | null
  unidadProvisional: string
  alcances: AlcanceSeleccionado[]
}

export const BORRADOR_VACIO: BorradorAtencion = {
  contrato: null,
  descripcion: '',
  es_riesgo: false,
  origen: '',
  unidadModo: 'existente',
  unidad: null,
  unidadProvisional: '',
  alcances: [],
}

export function claveAlcance(tipo: TipoAlcance, id: number): string {
  return `${tipo}:${id}`
}

/** Agrega el destino si no está o lo quita si ya estaba (selección con casillas). */
export function alternarAlcance(
  lista: AlcanceSeleccionado[],
  elemento: Omit<AlcanceSeleccionado, 'clave' | 'metrado' | 'unidad_medida_id'>,
): AlcanceSeleccionado[] {
  const clave = claveAlcance(elemento.tipo, elemento.id)
  if (lista.some((a) => a.clave === clave)) return lista.filter((a) => a.clave !== clave)
  return [...lista, { ...elemento, clave, metrado: '', unidad_medida_id: '' }]
}

/** `true` si el borrador tiene algo escrito o elegido (para avisar antes de salir). */
export function hayCambiosBorrador(b: BorradorAtencion): boolean {
  return Boolean(
    b.contrato || b.descripcion.trim() || b.es_riesgo || b.origen || b.unidad || b.unidadProvisional.trim() || b.alcances.length,
  )
}

/**
 * Normaliza el metrado escrito a texto decimal con punto y dos decimales («1 250,5» → «1250.50»).
 * `null` si no es un número válido no negativo con hasta 2 decimales.
 */
export function normalizarMetrado(texto: string): string | null {
  const limpio = texto.trim().replace(/[\s ]/g, '')
  if (!PATRON_METRADO.test(limpio)) return null
  return Number(limpio.replace(',', '.')).toFixed(2)
}

// --- Paso 1 ---------------------------------------------------------------------------------------------

export interface ErroresPaso1 {
  contrato?: string
  descripcion?: string
  origen?: string
  unidad?: string
  unidadProvisional?: string
}

export function validarPaso1(b: BorradorAtencion, hoy: string): ErroresPaso1 {
  const errores: ErroresPaso1 = {}
  if (!b.contrato) errores.contrato = 'Selecciona el contrato vigente que cubre este servicio'
  else if (b.contrato.vigencia_inicio > hoy || b.contrato.vigencia_fin < hoy) {
    errores.contrato = 'El contrato no está vigente hoy. Selecciona uno vigente'
  }
  if (!b.descripcion.trim()) errores.descripcion = 'Describe el trabajo solicitado'
  if (!b.origen) errores.origen = 'Indica el origen de la atención'
  if (b.origen === 'SolicitudUnidad') {
    if (b.unidadModo === 'existente' && !b.unidad) errores.unidad = 'Selecciona la unidad que solicita el trabajo'
    if (b.unidadModo === 'provisional') {
      const nombre = b.unidadProvisional.trim()
      if (!nombre) errores.unidadProvisional = 'Escribe el nombre de la unidad que solicita el trabajo'
      else if (nombre.length > LARGO_MAXIMO_UNIDAD) {
        errores.unidadProvisional = `Usa como máximo ${LARGO_MAXIMO_UNIDAD} caracteres`
      }
    }
  }
  return errores
}

// --- Paso 2 ---------------------------------------------------------------------------------------------

export interface ErroresPaso2 {
  /** Error general (sin alcances). */
  general?: string
  /** Errores por clave de alcance. */
  porAlcance: Record<string, { metrado?: string; unidad?: string }>
}

export function validarPaso2(alcances: AlcanceSeleccionado[]): ErroresPaso2 {
  const errores: ErroresPaso2 = { porAlcance: {} }
  if (alcances.length === 0) errores.general = 'Selecciona al menos un espacio o un ejemplar'
  for (const a of alcances) {
    const metrado = a.metrado.trim()
    const propios: { metrado?: string; unidad?: string } = {}
    if (metrado && normalizarMetrado(metrado) === null) {
      propios.metrado = 'Escribe un número mayor o igual a 0, con hasta 2 decimales'
    } else if (metrado && !a.unidad_medida_id) propios.unidad = 'Elige la unidad del metrado'
    else if (!metrado && a.unidad_medida_id) propios.metrado = 'Escribe el metrado o quita la unidad'
    if (propios.metrado || propios.unidad) errores.porAlcance[a.clave] = propios
  }
  return errores
}

export function hayErroresPaso2(errores: ErroresPaso2): boolean {
  return Boolean(errores.general) || Object.keys(errores.porAlcance).length > 0
}

// --- Envío ----------------------------------------------------------------------------------------------

/** Cuerpo de `POST atenciones/`. Supone el borrador ya validado. Solo envía los campos admitidos. */
export function construirEntrada(b: BorradorAtencion): CrearAtencionEntrada {
  if (!b.contrato || !b.origen) throw new Error('Borrador incompleto')
  const entrada: CrearAtencionEntrada = {
    contrato_id: b.contrato.id,
    descripcion: b.descripcion.trim(),
    origen: b.origen,
    alcances: b.alcances.map((a): AlcanceEntrada => {
      const destino = a.tipo === 'area' ? { area_verde_id: a.id } : { ejemplar_id: a.id }
      const metrado = a.metrado.trim() ? normalizarMetrado(a.metrado) : null
      return metrado !== null && a.unidad_medida_id
        ? { ...destino, metrado, unidad_medida_id: Number(a.unidad_medida_id) }
        : destino
    }),
  }
  if (b.es_riesgo) entrada.es_riesgo = true
  if (b.origen === 'SolicitudUnidad') {
    if (b.unidadModo === 'existente' && b.unidad) entrada.unidad_solicitante_id = b.unidad.id
    else entrada.unidad_provisional = b.unidadProvisional.trim()
  }
  return entrada
}

/** Paso del asistente al que pertenece un campo rechazado por el servidor (para llevar al usuario allí). */
export function pasoDeCampo(campo: string): 1 | 2 {
  return campo.startsWith('alcances') ? 2 : 1
}
