/**
 * Datos del informe final según el formato estándar del tipo de servicio (RF-SER-009, CU-MOD05-006 pasos 2 a 4).
 * Funciones puras, sin React: el borrador que edita el diálogo «Adjuntar reporte», su validación y los datos que
 * se envían.
 *
 * Replican las reglas del back-end (`DatosFormatoInforme`) para avisar antes de enviar; el back-end vuelve a
 * validarlo todo y su respuesta es la que vale.
 */
import type { CampoFormatoReporte, DatosFormato, FormatoReporte, SubcampoFormato, TipoDatoFormato } from '../types/tercerizados'

export const LARGO_MAXIMO_TEXTO = 500
export const LARGO_MAXIMO_TEXTO_LARGO = 10_000
export const MAXIMO_FILAS = 200
export const MAXIMO_DECIMALES = 4

/** Fila de un campo `JSON`: un valor por subcampo, como texto (los sí/no, «si» o «no»). */
export interface FilaBorrador {
  clave: string
  valores: Record<string, string>
}

/** Valor que se edita: texto para los campos simples («si» o «no» en los booleanos) y filas para los `JSON`. */
export type ValorBorrador = string | FilaBorrador[]

/** Borrador por nombre de campo. */
export type BorradorDatos = Record<string, ValorBorrador>

/** Errores por id de control (los de `idCampo` e `idSubcampo`). */
export type ErroresDatos = Record<string, string>

let contadorFilas = 0
function claveFila(): string {
  contadorFilas += 1
  return `fila-${contadorFilas}`
}

export function filaVacia(): FilaBorrador {
  return { clave: claveFila(), valores: {} }
}

/** Id del control de un campo simple, o del botón «Agregar fila» de un campo `JSON`. */
export function idCampo(indice: number): string {
  return `informe-campo-${indice}`
}

export function idSubcampo(indice: number, fila: string, subindice: number): string {
  return `informe-campo-${indice}-${fila}-${subindice}`
}

/** Etiqueta legible de un subcampo («nombre_cientifico» → «Nombre científico»). */
const ETIQUETAS_SUBCAMPO: Record<string, string> = {
  categoria: 'Categoría',
  nombre_cientifico: 'Nombre científico',
  tipo_organismo: 'Tipo de organismo',
  evidencia: 'Evidencia',
}

export function etiquetaSubcampo(subcampo: SubcampoFormato): string {
  const conocida = ETIQUETAS_SUBCAMPO[subcampo.nombre]
  if (conocida) return conocida
  const texto = subcampo.nombre.replace(/_/g, ' ').trim()
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function aTexto(valor: unknown, tipo: TipoDatoFormato): string {
  if (valor === null || valor === undefined) return ''
  if (tipo === 'Booleano') return valor === true ? 'si' : valor === false ? 'no' : ''
  if (typeof valor === 'string' || typeof valor === 'number') return String(valor)
  return ''
}

/**
 * Borrador inicial: vacío, o con los datos de una revisión anterior registrada con el mismo formato. Cada campo
 * `JSON` empieza con una fila (vacía si no hay datos), para que se pueda escribir sin pulsar antes «Agregar fila».
 */
export function borradorInicial(formato: FormatoReporte, anteriores?: DatosFormato | null): BorradorDatos {
  const borrador: BorradorDatos = {}
  for (const campo of formato.campos) {
    const previo = anteriores?.[campo.nombre_campo]
    if (campo.tipo_dato === 'JSON') {
      const filas = Array.isArray(previo)
        ? previo.map((fila) => ({
            clave: claveFila(),
            valores: Object.fromEntries(
              (campo.subcampos ?? []).map((sub) => [sub.nombre, aTexto(fila[sub.nombre], sub.tipo_dato)]),
            ),
          }))
        : []
      borrador[campo.nombre_campo] = filas.length > 0 ? filas : [filaVacia()]
    } else {
      borrador[campo.nombre_campo] = aTexto(previo, campo.tipo_dato)
    }
  }
  return borrador
}

function filas(valor: ValorBorrador | undefined): FilaBorrador[] {
  return Array.isArray(valor) ? valor : []
}

function texto(valor: ValorBorrador | undefined): string {
  return typeof valor === 'string' ? valor.trim() : ''
}

function filaConDatos(fila: FilaBorrador): boolean {
  return Object.values(fila.valores).some((v) => v.trim() !== '')
}

/** El campo tiene algún dato (en un `JSON`, al menos una fila con algún valor). */
export function campoCompleto(campo: CampoFormatoReporte, valor: ValorBorrador | undefined): boolean {
  return campo.tipo_dato === 'JSON' ? filas(valor).some(filaConDatos) : texto(valor) !== ''
}

/** Obligatorios con dato y total de obligatorios, para el indicador de avance. */
export function avanceObligatorios(formato: FormatoReporte, borrador: BorradorDatos): { completos: number; total: number } {
  const obligatorios = formato.campos.filter((c) => c.obligatorio)
  return {
    completos: obligatorios.filter((c) => campoCompleto(c, borrador[c.nombre_campo])).length,
    total: obligatorios.length,
  }
}

/** Número escrito en el campo («1 250,5» → «1250.5»). */
export function normalizarNumero(valor: string): string {
  return valor.replace(/\s/g, '').replace(',', '.')
}

/** Error de formato de un valor simple ya escrito; `undefined` si es válido. */
function errorValor(tipo: TipoDatoFormato, valor: string): string | undefined {
  if (tipo === 'Entero' && !/^\d+$/.test(normalizarNumero(valor))) return 'Escribe un número entero'
  if (tipo === 'Decimal') {
    const numero = normalizarNumero(valor)
    if (!/^\d+(\.\d+)?$/.test(numero)) return 'Escribe un número, por ejemplo 120,5'
    if ((numero.split('.')[1] ?? '').length > MAXIMO_DECIMALES) return `Usa como máximo ${MAXIMO_DECIMALES} decimales`
  }
  if (tipo === 'Fecha' && !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return 'Elige una fecha válida'
  if (tipo === 'Texto' && valor.length > LARGO_MAXIMO_TEXTO) return `Usa como máximo ${LARGO_MAXIMO_TEXTO} caracteres`
  if (tipo === 'Texto largo' && valor.length > LARGO_MAXIMO_TEXTO_LARGO) return `Usa como máximo ${LARGO_MAXIMO_TEXTO_LARGO} caracteres`
  return undefined
}

/**
 * Valida el borrador: obligatorios con dato y cada valor con el formato de su tipo. Las claves son los ids de los
 * controles, para enlazar cada error con su campo y llevar el foco al primero.
 */
export function validarDatos(formato: FormatoReporte, borrador: BorradorDatos): ErroresDatos {
  const errores: ErroresDatos = {}
  formato.campos.forEach((campo, indice) => {
    const valor = borrador[campo.nombre_campo]
    if (campo.tipo_dato === 'JSON') {
      const lista = filas(valor)
      if (lista.length > MAXIMO_FILAS) errores[idCampo(indice)] = `Registra como máximo ${MAXIMO_FILAS} filas`
      for (const fila of lista) {
        for (const [subindice, sub] of (campo.subcampos ?? []).entries()) {
          const escrito = (fila.valores[sub.nombre] ?? '').trim()
          const error = escrito ? errorValor(sub.tipo_dato, escrito) : undefined
          if (error) errores[idSubcampo(indice, fila.clave, subindice)] = error
        }
      }
      if (campo.obligatorio && !lista.some(filaConDatos)) {
        const primera = lista[0]
        errores[primera && (campo.subcampos ?? []).length > 0 ? idSubcampo(indice, primera.clave, 0) : idCampo(indice)] =
          `Registra al menos una fila de «${campo.nombre_campo}»`
      }
      return
    }
    const escrito = texto(valor)
    if (!escrito) {
      if (campo.obligatorio) errores[idCampo(indice)] = campo.tipo_dato === 'Booleano' ? 'Elige sí o no' : `Completa «${campo.nombre_campo}»`
      return
    }
    const error = errorValor(campo.tipo_dato, escrito)
    if (error) errores[idCampo(indice)] = error
  })
  return errores
}

/** Valor que se envía de un dato simple ya validado. */
function valorEnviado(tipo: TipoDatoFormato, escrito: string): string | boolean {
  if (tipo === 'Booleano') return escrito === 'si'
  if (tipo === 'Entero' || tipo === 'Decimal') return normalizarNumero(escrito)
  return escrito
}

/** Datos que se envían: en el orden del formato, sin campos ni filas vacías. */
export function datosParaEnviar(formato: FormatoReporte, borrador: BorradorDatos): DatosFormato {
  const datos: DatosFormato = {}
  for (const campo of formato.campos) {
    const valor = borrador[campo.nombre_campo]
    if (campo.tipo_dato === 'JSON') {
      const enviadas = filas(valor)
        .map((fila) => {
          const salida: Record<string, string | boolean> = {}
          for (const sub of campo.subcampos ?? []) {
            const escrito = (fila.valores[sub.nombre] ?? '').trim()
            if (escrito) salida[sub.nombre] = valorEnviado(sub.tipo_dato, escrito)
          }
          return salida
        })
        .filter((fila) => Object.keys(fila).length > 0)
      if (enviadas.length > 0) datos[campo.nombre_campo] = enviadas
    } else {
      const escrito = texto(valor)
      if (escrito) datos[campo.nombre_campo] = valorEnviado(campo.tipo_dato, escrito)
    }
  }
  return datos
}
