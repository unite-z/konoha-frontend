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
