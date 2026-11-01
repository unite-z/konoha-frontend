/**
 * Valores de la revisión de RF-IA-001: presentación, conversión de las correcciones al tipo del dato y
 * cifras del avance. Lógica pura, sin interfaz.
 */
import { claveCampo, type AccionDecision, type CampoSolicitado, type SugerenciaIA, type TipoDato, type ValorCampo } from '../../../../types/ia'
import { esFechaIsoValida, formatearFecha, formatearNumero, SIN_VALOR } from '../../../../utils/formato'

/** Mensajes de la revisión. */
export const MENSAJES = {
  sinDecision: 'Elige una decisión para cada dato',
  sinValorAceptar: 'No hay valor que aceptar: corrígelo o descártalo',
  json: 'Escribe una lista JSON válida, por ejemplo [{"nombre": "..."}]',
  vacio: 'Escribe el valor corregido',
  entero: 'Escribe un número entero, por ejemplo 12',
  decimal: 'Escribe un número, por ejemplo 1250,5',
  booleano: 'Elige Sí o No',
  fecha: 'Indica una fecha válida',
  correcciones: 'Corrige los valores marcados',
} as const

export const ACCIONES: AccionDecision[] = ['aceptar', 'corregir', 'descartar']

export const idDecision = (clave: string, accion: AccionDecision) => `decision-${clave}-${accion}`
export const idCorreccion = (clave: string) => `correccion-${clave}`

export function tieneValor(valor: ValorCampo | undefined): boolean {
  return valor !== null && valor !== undefined
}

/** Valor sugerido por la IA para un campo (null si no lo encontró). */
export function valorSugerido(sugerencia: SugerenciaIA, campo: CampoSolicitado): ValorCampo {
  return sugerencia.contenido.propuesta[claveCampo(campo.campo_id)]?.valor ?? null
}

export function textoValorSimple(valor: unknown, tipo?: TipoDato | null): string {
  if (valor === null || valor === undefined) return SIN_VALOR
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No'
  if (typeof valor === 'number') return formatearNumero(valor)
  if (typeof valor === 'string') return tipo === 'Fecha' || esFechaIsoValida(valor) ? formatearFecha(valor) : valor
  return JSON.stringify(valor)
}

/** Objeto de una lista JSON como «clave: valor · clave: valor». */
export function textoObjeto(objeto: Record<string, unknown>): string {
  return Object.entries(objeto)
    .map(([clave, valor]) => `${clave}: ${textoValorSimple(valor)}`)
    .join(' · ')
}

/** Texto inicial del campo de corrección, a partir del valor sugerido. */
export function valorATexto(tipo: TipoDato | null, valor: ValorCampo): string {
  if (valor === null || valor === undefined) return ''
  if (tipo === 'Booleano') return valor ? 'si' : 'no'
  if (tipo === 'Decimal' && typeof valor === 'number') return String(valor).replace('.', ',')
  if (tipo === 'JSON') return JSON.stringify(valor, null, 2)
  return String(valor)
}

/** Convierte el texto del campo de corrección al tipo del dato, o devuelve qué hacer. */
export function convertirCorreccion(tipo: TipoDato | null, texto: string): { valor?: ValorCampo; error?: string } {
  const limpio = texto.trim()
  switch (tipo) {
    case 'Entero':
      if (limpio === '') return { error: MENSAJES.vacio }
      return /^-?\d+$/.test(limpio) ? { valor: Number(limpio) } : { error: MENSAJES.entero }
    case 'Decimal': {
      if (limpio === '') return { error: MENSAJES.vacio }
      const normalizado = limpio.replace(/[\s ]/g, '').replace(',', '.')
      return /^-?\d+(\.\d+)?$/.test(normalizado) ? { valor: Number(normalizado) } : { error: MENSAJES.decimal }
    }
    case 'Booleano':
      if (limpio === 'si') return { valor: true }
      if (limpio === 'no') return { valor: false }
      return { error: MENSAJES.booleano }
    case 'Fecha':
      if (limpio === '') return { error: MENSAJES.vacio }
      return esFechaIsoValida(limpio) ? { valor: limpio } : { error: MENSAJES.fecha }
    case 'JSON': {
      if (limpio === '') return { error: MENSAJES.json }
      try {
        const lista: unknown = JSON.parse(limpio)
        const valida =
          Array.isArray(lista) && lista.every((e) => e !== null && typeof e === 'object' && !Array.isArray(e))
        return valida ? { valor: lista as Record<string, unknown>[] } : { error: MENSAJES.json }
      } catch {
        return { error: MENSAJES.json }
      }
    }
    default: // Texto, Texto largo o sin tipo
      return limpio === '' ? { error: MENSAJES.vacio } : { valor: texto }
  }
}

/** Datos con valor sugerido frente al total de datos solicitados. */
export function coberturaSugerencia(sugerencia: SugerenciaIA): { conValor: number; total: number } {
  const campos = sugerencia.contenido.entrada.campos_solicitados
  return { conValor: campos.filter((c) => tieneValor(valorSugerido(sugerencia, c))).length, total: campos.length }
}

/** Filtros de la lista de datos de la revisión. */
export type FiltroCampos = 'todos' | 'pendientes' | 'sin_valor' | 'obligatorios'

export function pasaFiltro(
  filtro: FiltroCampos,
  campo: CampoSolicitado,
  valor: ValorCampo,
  accion: AccionDecision | undefined,
): boolean {
  switch (filtro) {
    case 'pendientes':
      return accion === undefined
    case 'sin_valor':
      return !tieneValor(valor)
    case 'obligatorios':
      return campo.obligatorio
    default:
      return true
  }
}

/** Tramo horario «06:30 - 08:30» (también con «–» o «a»). */
const PATRON_TRAMO = /\b\d{1,2}:\d{2}\s*(?:-|–|a)\s*\d{1,2}:\d{2}\b/g

/**
 * Líneas de un texto para mostrarlo legible: respeta los saltos de línea; si no los tiene pero enumera varios
 * tramos horarios («06:30 - 08:30: Tontódromo 08:30 - 09:30: …»), pone cada tramo en su línea.
 */
export function partirEnLineas(texto: string): string[] {
  const conSaltos = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (conSaltos.length > 1) return conSaltos
  const inicios = [...texto.matchAll(PATRON_TRAMO)].map((m) => m.index ?? 0)
  if (inicios.length < 2) return [texto.trim()]
  const lineas: string[] = []
  const previo = texto.slice(0, inicios[0]).trim()
  if (previo) lineas.push(previo)
  inicios.forEach((inicio, i) => {
    const linea = texto.slice(inicio, inicios[i + 1] ?? texto.length).trim().replace(/[,;]$/, '')
    if (linea) lineas.push(linea)
  })
  return lineas
}
