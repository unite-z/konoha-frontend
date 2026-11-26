/**
 * Adaptador del cronograma de IA para `RevisionIa` (RD-33): traduce la propuesta del backend al contrato del núcleo
 * y las decisiones al cuerpo de `validar/`. Una sugerencia que coincide con una prohibición sale bloqueada (v6): solo
 * se puede descartar, así que nunca se envía `confirma_restriccion`. Antes de enviar, «Confirmar planificación» pide
 * conformidad con el recuento de lo que se programará, como la revisión actual.
 */
import { createElement } from 'react'
import { ErrorApi } from '@/services/api/cliente'
import { confirmarCronograma, obtenerCronograma, rechazarCronograma } from '@/services/api/cronogramaIa'
import type {
  CuerpoValidacionCronograma,
  PropuestaCronograma,
  SugerenciaCronograma,
  ValoresCronograma,
} from '@/types/cronogramaIa'
import {
  coincideConProhibicion,
  resumenConfirmacion,
  textoResumenConfirmacion,
  valoresDePropuesta,
} from '@/utils/cronogramaIa'
import type {
  AdaptadorRevision,
  DecisionElemento,
  ElementoRevision,
  PropuestaRevision,
  RegistroDecision,
} from '@/rediseno/base/RevisionIa/contrato'
import { HuecoDecision, SugerenciaElemento } from './ElementoCronograma'
import { nombresCronograma, sinCambios, textoValores } from './textoValores'
import VistasPropuesta from './VistasPropuesta'

export interface OpcionesAdaptadorCronograma {
  id: number
  /** Pide conformidad con el recuento («Se programarán…»); `false` si la persona vuelve atrás sin confirmar. */
  confirmar: (resumen: string) => Promise<boolean>
  /** Tras confirmar la planificación (el panel se cierra con un fundido). */
  alConfirmar: () => void
  /** Tras descartar la propuesta completa. */
  alRechazar: () => void
}

function registroDe(s: SugerenciaCronograma, p: PropuestaCronograma): RegistroDecision<ValoresCronograma> | null {
  const decidida = s.contenido.decision?.por_propuesta[p.clave]
  if (!decidida) return null
  return {
    accion: decidida.accion,
    valorFinal: decidida.accion === 'descartar' ? null : (decidida.valores_finales ?? valoresDePropuesta(p)),
    decididoPor: s.validador_id === null ? 'una persona' : `la persona n.º ${s.validador_id}`,
    decididoEn: s.fecha_validacion ?? s.fecha_modificacion ?? '',
  }
}

export function cuerpoValidacion(
  propuestas: PropuestaCronograma[],
  decisiones: Record<string, DecisionElemento<ValoresCronograma>>,
): CuerpoValidacionCronograma {
  const bloqueadas = propuestas.filter((p) => coincideConProhibicion(p) && decisiones[p.clave]?.accion !== 'descartar')
  if (bloqueadas.length > 0) {
    const cuantas =
      bloqueadas.length === 1 ? '1 sugerencia está bloqueada' : `${bloqueadas.length} sugerencias están bloqueadas`
    throw new ErrorApi(422, 'sugerencia-bloqueada', `${cuantas} por una prohibición: descártala para confirmar.`)
  }
  const sinIndicar = propuestas.filter(
    (p) => decisiones[p.clave]?.accion === 'corregir' && sinCambios(p, decisiones[p.clave].valorFinal),
  )
  if (sinIndicar.length > 0) {
    const nombres = sinIndicar.map((p) => `«${p.actividad} · ${p.ubicacion}»`).join(', ')
    throw new ErrorApi(422, 'modificacion-sin-cambios', `Indica los cambios de ${nombres} o acéptala tal cual.`)
  }
  const por_propuesta: CuerpoValidacionCronograma['por_propuesta'] = {}
  for (const p of propuestas) {
    const d = decisiones[p.clave]
    if (!d) continue
    por_propuesta[p.clave] = {
      accion: d.accion,
      valores_finales: d.accion === 'corregir' ? d.valorFinal : null,
      confirma_restriccion: false,
    }
  }
  return { por_propuesta }
}

export function crearAdaptadorCronograma({
  id,
  confirmar,
  alConfirmar,
  alRechazar,
}: OpcionesAdaptadorCronograma): AdaptadorRevision<ValoresCronograma> {
  // Las sugerencias de la última carga: las necesitan el hueco de cada decisión y la validación.
  let propuestas: PropuestaCronograma[] = []

  function aRevision(s: SugerenciaCronograma): PropuestaRevision<ValoresCronograma> {
    propuestas = s.contenido.propuestas
    const elementos: ElementoRevision<ValoresCronograma>[] = propuestas.map((p) => ({
      id: p.clave,
      titulo: `${p.actividad} · ${p.ubicacion}`,
      sugerencia: createElement(SugerenciaElemento, { propuesta: p }),
      valorSugerido: valoresDePropuesta(p),
      decision: registroDe(s, p),
    }))
    return {
      id: s.id,
      estado: s.estado,
      resumen: createElement(VistasPropuesta, { sugerencia: s }),
      ia: s.contenido.ia,
      contexto: s.contenido,
      elementos,
      validadaPor: s.validador_id === null ? null : `la persona n.º ${s.validador_id}`,
      validadaEn: s.fecha_validacion,
      motivoRechazo: s.contenido.decision?.motivo_rechazo ?? null,
    }
  }

  return {
    clave: `konoha-propone|${id}`,
    tituloFaltantes: 'Faltan datos para un cronograma confiable',
    motivoRechazo: 'opcional',
    cargar: async (signal) => aRevision(await obtenerCronograma(id, signal)),
    validar: async (decisiones) => {
      const cuerpo = cuerpoValidacion(propuestas, decisiones)
      const resumen = textoResumenConfirmacion(resumenConfirmacion(Object.values(cuerpo.por_propuesta)))
      if (!(await confirmar(resumen))) return
      await confirmarCronograma(id, cuerpo)
      alConfirmar()
    },
    rechazar: async (motivo) => {
      await rechazarCronograma(id, motivo || null)
      alRechazar()
    },
    renderHueco: ({ elemento, decision, cambiar }) => {
      const propuesta = propuestas.find((p) => p.clave === elemento.id)
      if (!propuesta) return null
      return createElement(HuecoDecision, { propuesta, propuestas, contexto: { elemento, decision, cambiar } })
    },
    mostrarValor: (valor) => textoValores(valor, nombresCronograma(propuestas)),
  }
}
