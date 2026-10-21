/**
 * Traducción de los valores del dominio a presentación, en un solo lugar (Guía Web 5.6:
 * «si los estados cambian, el badge cambia de texto, no de patrón»).
 *
 * Significado de los tonos (Guía Web 5.6): éxito = conforme, advertencia = requiere atención,
 * error = incumple, neutral = sin evaluación, info = informativo.
 * Los estados que el back-end ya devuelve en texto legible se muestran tal cual; aquí solo se elige el tono.
 */
import type { Tono } from '../components/ui/Badge'
import type { AccionDecision, EstadoSugerencia } from '../types/ia'
import type { EstadoDuracion, EstadoFrecuencia, Modalidad } from '../types/reportes'

// --- RF-REP-002 ---------------------------------------------------------------

const TONO_CUMPLIMIENTO: Record<EstadoFrecuencia | EstadoDuracion, Tono> = {
  'Dentro de la frecuencia': 'exito',
  'Dentro del máximo': 'exito',
  Tolerado: 'advertencia',
  'Fuera de frecuencia': 'error',
  'Excede el máximo': 'error',
  'Sin ciclo anterior': 'neutral',
  'Límite no configurado': 'neutral',
  'Sin fecha de fin de corte': 'neutral',
}

/** Tono de la insignia de `estado_frecuencia` o `estado_duracion`. */
export function tonoCumplimiento(estado: string): Tono {
  return TONO_CUMPLIMIENTO[estado as EstadoFrecuencia | EstadoDuracion] ?? 'neutral'
}

/** Estados de frecuencia en los que no hay cálculo de cumplimiento (HU-MOD06-009). */
export const FRECUENCIA_SIN_CALCULO: ReadonlySet<string> = new Set<EstadoFrecuencia>([
  'Sin ciclo anterior',
  'Límite no configurado',
])

/** Estados de duración en los que no hay cálculo de cumplimiento (HU-MOD06-009). */
export const DURACION_SIN_CALCULO: ReadonlySet<string> = new Set<EstadoDuracion>([
  'Sin fecha de fin de corte',
  'Límite no configurado',
])

// --- RF-REP-006 ---------------------------------------------------------------

const TEXTO_MODALIDAD: Record<Modalidad, string> = {
  PersonalPropio: 'Personal propio',
  Tercerizado: 'Tercerizado',
}

/** Texto de interfaz de la modalidad de ejecución (enumerado Ejecutor). */
export function textoModalidad(modalidad: Modalidad): string {
  return TEXTO_MODALIDAD[modalidad]
}

/** Opciones del selector de modalidad, en el orden del enumerado. */
export const OPCIONES_MODALIDAD: { valor: Modalidad; texto: string }[] = (
  Object.keys(TEXTO_MODALIDAD) as Modalidad[]
).map((valor) => ({ valor, texto: TEXTO_MODALIDAD[valor] }))

// --- RF-IA-001 ----------------------------------------------------------------

const TONO_SUGERENCIA: Record<EstadoSugerencia, Tono> = {
  Propuesta: 'advertencia',
  Validada: 'exito',
  Rechazada: 'neutral',
}

/** Texto de interfaz del estado de una sugerencia, por si el back-end no envía `etiqueta_estado`. */
const ETIQUETA_SUGERENCIA: Record<EstadoSugerencia, string> = {
  Propuesta: 'Pendiente de revisión',
  Validada: 'Validada',
  Rechazada: 'Rechazada',
}

/** Insignia del estado de una sugerencia de IA. */
export function insigniaSugerencia(estado: EstadoSugerencia, etiqueta: string | null): { texto: string; tono: Tono } {
  return { texto: etiqueta ?? ETIQUETA_SUGERENCIA[estado], tono: TONO_SUGERENCIA[estado] }
}

const INSIGNIA_ACCION: Record<AccionDecision, { texto: string; tono: Tono }> = {
  aceptar: { texto: 'Aceptado', tono: 'exito' },
  corregir: { texto: 'Corregido', tono: 'info' },
  descartar: { texto: 'Descartado', tono: 'neutral' },
}

/** Insignia de la decisión validada sobre un campo. */
export function insigniaAccion(accion: AccionDecision): { texto: string; tono: Tono } {
  return INSIGNIA_ACCION[accion]
}

/** Etiquetas de las opciones de decisión de un campo. */
export const ETIQUETA_OPCION_ACCION: Record<AccionDecision, string> = {
  aceptar: 'Aceptar',
  corregir: 'Corregir',
  descartar: 'Descartar',
}
