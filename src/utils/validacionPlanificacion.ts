/** Validación en cliente de MOD-03. El back-end vuelve a validar y su respuesta manda. */
import type { DuracionEntrada, FrecuenciaEntrada, RestriccionEntrada } from '../types/planificacion'

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

export interface BorradorDuracion {
  duracion: string
  limpieza: string
  inicio: string
  fin: string
}

export type ErroresDuracion = Partial<Record<keyof BorradorDuracion, string>>

const PATRON_HORA = /^([01]\d|2[0-3]):[0-5]\d$/

/** Duración máxima obligatoria; días de limpieza y horario opcionales (el fin va después del inicio). */
export function validarDuracion(borrador: BorradorDuracion): { errores: ErroresDuracion; entrada: DuracionEntrada | null } {
  const errores: ErroresDuracion = {}
  const duracion = enteroPositivo(borrador.duracion)
  const limpieza = borrador.limpieza.trim() ? enteroPositivo(borrador.limpieza) : undefined
  if (duracion === null) errores.duracion = MENSAJE_ENTERO
  if (limpieza === null) errores.limpieza = MENSAJE_ENTERO
  if (borrador.inicio && !PATRON_HORA.test(borrador.inicio)) errores.inicio = 'Usa el formato HH:MM'
  if (borrador.fin && !PATRON_HORA.test(borrador.fin)) errores.fin = 'Usa el formato HH:MM'
  if (!errores.inicio && !errores.fin && borrador.inicio && borrador.fin && borrador.fin <= borrador.inicio) {
    errores.fin = 'La hora de fin debe ser posterior a la de inicio'
  }
  if (Object.keys(errores).length > 0 || duracion === null) return { errores, entrada: null }
  return {
    errores,
    entrada: {
      duracion_maxima_dias: duracion,
      ...(limpieza ? { dias_limpieza: limpieza } : {}),
      ...(borrador.inicio ? { hora_inicio: borrador.inicio } : {}),
      ...(borrador.fin ? { hora_fin: borrador.fin } : {}),
    },
  }
}

export interface BorradorRestriccion {
  tipo: string
  fechaInicio: string
  fechaFin: string
  horaInicio: string
  horaFin: string
  descripcion: string
}

export type ErroresRestriccion = Partial<Record<keyof BorradorRestriccion, string>>

/** Tipo y fechas obligatorios; el fin no puede ser anterior al inicio; las horas, `HH:MM`. */
export function validarRestriccion(borrador: BorradorRestriccion): {
  errores: ErroresRestriccion
  entrada: RestriccionEntrada | null
} {
  const errores: ErroresRestriccion = {}
  const tipo = enteroPositivo(borrador.tipo)
  if (tipo === null) errores.tipo = 'Elige el tipo de restricción'
  if (!borrador.fechaInicio) errores.fechaInicio = 'Indica la fecha de inicio'
  if (!borrador.fechaFin) errores.fechaFin = 'Indica la fecha de fin'
  else if (borrador.fechaInicio && borrador.fechaFin < borrador.fechaInicio) {
    errores.fechaFin = 'La fecha de fin no puede ser anterior a la de inicio'
  }
  if (borrador.horaInicio && !PATRON_HORA.test(borrador.horaInicio)) errores.horaInicio = 'Usa el formato HH:MM'
  if (borrador.horaFin && !PATRON_HORA.test(borrador.horaFin)) errores.horaFin = 'Usa el formato HH:MM'
  if (!errores.horaInicio && !errores.horaFin && borrador.horaInicio && borrador.horaFin) {
    if (borrador.fechaInicio === borrador.fechaFin && borrador.horaFin <= borrador.horaInicio) {
      errores.horaFin = 'La hora de fin debe ser posterior a la de inicio'
    }
  }
  if (Object.keys(errores).length > 0 || tipo === null) return { errores, entrada: null }
  const descripcion = borrador.descripcion.trim()
  return {
    errores,
    entrada: {
      tipo_restriccion_id: tipo,
      fecha_inicio: borrador.fechaInicio,
      fecha_fin: borrador.fechaFin,
      ...(borrador.horaInicio ? { hora_inicio: borrador.horaInicio } : {}),
      ...(borrador.horaFin ? { hora_fin: borrador.horaFin } : {}),
      ...(descripcion ? { descripcion } : {}),
    },
  }
}
