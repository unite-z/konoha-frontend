/**
 * Lógica pura de RN-IA-002 (prioridades de atención con IA): insignias, resumen de la bandeja, orden y filtro del
 * ranking, decisiones por elemento y el cuerpo de la validación. La IA solo propone (RN-IA-001).
 */
import type { NombreIcono } from '@/design-system/Icono'
import type { Tono } from '@/design-system/tonos'
import type { AccionDecision } from '../types/ia'
import type {
  AlcancePriorizacion,
  CuerpoValidacionPriorizacion,
  DecisionElementoPrioridad,
  ElementoPriorizado,
  PrioridadAtencion,
} from '../types/priorizacionIa'
import { formatearNumero } from './formato'

export const PRIORIDADES: readonly PrioridadAtencion[] = ['Alta', 'Media', 'Baja']

/** Insignia de la prioridad (como la severidad del mockup): Alta en rojo con alerta, Media en ámbar, Baja neutra. */
export function insigniaPrioridad(prioridad: PrioridadAtencion): { texto: string; tono: Tono; icono?: NombreIcono } {
  if (prioridad === 'Alta') return { texto: 'Alta', tono: 'error', icono: 'triangulo' }
  if (prioridad === 'Media') return { texto: 'Media', tono: 'advertencia' }
  return { texto: 'Baja', tono: 'neutral' }
}

const TEXTO_ALCANCE: Record<AlcancePriorizacion, string> = {
  Areas: 'Espacios (áreas y jardines)',
  Ejemplares: 'Ejemplares',
  Ambos: 'Espacios y ejemplares',
}

export const OPCIONES_ALCANCE: readonly { valor: AlcancePriorizacion; texto: string }[] = (
  Object.keys(TEXTO_ALCANCE) as AlcancePriorizacion[]
).map((valor) => ({ valor, texto: TEXTO_ALCANCE[valor] }))

/** «Espacios y ejemplares · 15 días». */
export function textoAlcance(alcance: AlcancePriorizacion, horizonteDias: number): string {
  return `${TEXTO_ALCANCE[alcance]} · ${formatearNumero(horizonteDias)} días`
}

/** Elementos por prioridad sugerida. */
export function contarPrioridades(elementos: ElementoPriorizado[]): Record<PrioridadAtencion, number> {
  const cuenta: Record<PrioridadAtencion, number> = { Alta: 0, Media: 0, Baja: 0 }
  for (const e of elementos) cuenta[e.prioridad_sugerida] += 1
  return cuenta
}

/** «4 altas · 5 medias · 3 bajas» (sin las que no tienen elementos). */
export function resumenPrioridades(elementos: ElementoPriorizado[]): string {
  const cuenta = contarPrioridades(elementos)
  const partes = PRIORIDADES.filter((p) => cuenta[p] > 0).map((p) => {
    const n = cuenta[p]
    return `${formatearNumero(n)} ${p.toLowerCase()}${n === 1 ? '' : 's'}`
  })
  return partes.join(' · ') || 'Sin elementos'
}

/** De mayor a menor puntuación (empates por nombre). */
export function ordenarPorPuntuacion(elementos: ElementoPriorizado[]): ElementoPriorizado[] {
  return [...elementos].sort((a, b) => b.puntuacion - a.puntuacion || a.nombre.localeCompare(b.nombre, 'es'))
}

/** Solo los de una prioridad sugerida (vacío = todos). */
export function filtrarPorPrioridad(
  elementos: ElementoPriorizado[],
  prioridad: PrioridadAtencion | '',
): ElementoPriorizado[] {
  return prioridad ? elementos.filter((e) => e.prioridad_sugerida === prioridad) : elementos
}

/** Decisión en curso de un elemento (la prioridad solo cuenta al corregir). */
export interface DecisionEnCurso {
  accion?: AccionDecision
  prioridad: PrioridadAtencion | ''
}

/** Mensajes de la revisión. */
export const MENSAJES_PRIORIZACION = {
  sinDecision: 'Elige aceptar, corregir o descartar',
  sinPrioridad: 'Elige la prioridad final',
} as const

/** Error de cada elemento sin decisión completa (las claves que faltan), en el orden de los elementos. */
export function decisionesCompletas(
  elementos: ElementoPriorizado[],
  decisiones: Record<string, DecisionEnCurso | undefined>,
): Record<string, string> {
  const errores: Record<string, string> = {}
  for (const e of elementos) {
    const decision = decisiones[e.clave]
    if (!decision?.accion) errores[e.clave] = MENSAJES_PRIORIZACION.sinDecision
    else if (decision.accion === 'corregir' && !decision.prioridad)
      errores[e.clave] = MENSAJES_PRIORIZACION.sinPrioridad
  }
  return errores
}

/**
 * Cuerpo de `validar/`: la prioridad final solo va al corregir (y es obligatoria). `null` si falta alguna decisión.
 */
export function cuerpoValidacion(
  elementos: ElementoPriorizado[],
  decisiones: Record<string, DecisionEnCurso | undefined>,
): CuerpoValidacionPriorizacion | null {
  if (Object.keys(decisionesCompletas(elementos, decisiones)).length > 0) return null
  const porElemento: CuerpoValidacionPriorizacion['por_elemento'] = {}
  for (const e of elementos) {
    const decision = decisiones[e.clave]
    if (!decision?.accion) return null
    porElemento[e.clave] =
      decision.accion === 'corregir' && decision.prioridad
        ? { accion: 'corregir', prioridad_final: decision.prioridad }
        : { accion: decision.accion }
  }
  return { por_elemento: porElemento }
}

/** «Aceptada: Alta», «Corregida: Media → Alta» o «Descartada». */
export function textoDecisionFinal(
  sugerida: PrioridadAtencion,
  decision: DecisionElementoPrioridad | undefined,
): string {
  if (!decision) return 'Sin decisión'
  if (decision.accion === 'descartar') return 'Descartada'
  if (decision.accion === 'corregir') return `Corregida: ${sugerida} → ${decision.prioridad_final ?? sugerida}`
  return `Aceptada: ${sugerida}`
}

/** Id del selector de la prioridad final (para llevar el foco desde el resumen de errores). */
export function idPrioridadFinal(clave: string): string {
  return `prioridad-${clave}`
}
