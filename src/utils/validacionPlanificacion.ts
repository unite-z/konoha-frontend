/** Validación en cliente de MOD-03. El back-end vuelve a validar y su respuesta manda. */
import type { FrecuenciaEntrada } from '../types/planificacion'

export interface BorradorFrecuencia {
  teorica: string
  practica: string
  maxima: string
}

export type ErroresFrecuencia = Partial<Record<keyof BorradorFrecuencia, string>>

const MENSAJE_ENTERO = 'Escribe un número entero de días mayor que 0'

/** Entero positivo, o `null` si el texto no lo es. */
function enteroPositivo(texto: string): number | null {
  return /^\d+$/.test(texto.trim()) && Number(texto) > 0 ? Number(texto) : null
}

/** Teórica obligatoria; práctica y máxima opcionales; la máxima no puede ser menor que la habitual. */
export function validarFrecuencia(borrador: BorradorFrecuencia): {
  errores: ErroresFrecuencia
  entrada: FrecuenciaEntrada | null
} {
  const errores: ErroresFrecuencia = {}
  const teorica = enteroPositivo(borrador.teorica)
  const practica = borrador.practica.trim() ? enteroPositivo(borrador.practica) : undefined
  const maxima = borrador.maxima.trim() ? enteroPositivo(borrador.maxima) : undefined
  if (teorica === null) errores.teorica = MENSAJE_ENTERO
  if (practica === null) errores.practica = MENSAJE_ENTERO
  if (maxima === null) errores.maxima = MENSAJE_ENTERO
  const habitual = practica ?? teorica
  if (maxima && habitual && maxima < habitual) {
    errores.maxima = `La frecuencia máxima no puede ser menor que la habitual (${habitual} días)`
  }
  if (Object.keys(errores).length > 0 || teorica === null) return { errores, entrada: null }
  return {
    errores,
    entrada: {
      frecuencia_teorica_dias: teorica,
      ...(practica ? { frecuencia_practica_dias: practica } : {}),
      ...(maxima ? { frecuencia_maxima_dias: maxima } : {}),
    },
  }
}
