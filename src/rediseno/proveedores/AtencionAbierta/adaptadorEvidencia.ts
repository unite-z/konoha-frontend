/**
 * Adaptador del análisis de evidencia fitosanitaria para `RevisionIa` (RD-55): traduce el análisis del backend al
 * contrato del núcleo y las decisiones al cuerpo de `validar/`. Cada hipótesis es un elemento y «No es posible
 * concluir» es otro; ninguno llega decidido. La validación técnica es una sola cosa (confirmar una hipótesis, otra
 * categoría o no concluir), así que se exige exactamente una opción y nunca se elige una por la persona. Nunca indica
 * un tratamiento.
 */
import { createElement } from 'react'
import type {
  AdaptadorRevision,
  DecisionElemento,
  ElementoRevision,
  PropuestaRevision,
  RegistroDecision,
} from '@/rediseno/base/RevisionIa/contrato'
import { ErrorApi } from '@/services/api/cliente'
import { descartarEvidencia, obtenerAnalisisEvidencia, validarEvidencia } from '@/services/api/evidenciaFitosanitariaIa'
import type {
  CuerpoValidacionEvidencia,
  HipotesisFitosanitaria,
  SugerenciaEvidencia,
} from '@/types/evidenciaFitosanitariaIa'
import {
  cuerpoValidacion,
  ETIQUETA_CATEGORIA,
  FORMULARIO_VACIO,
  ordenarHipotesis,
  textoConfianza,
  type FormularioValidacion,
} from '@/utils/evidenciaFitosanitariaIa'
import HuecoEvidencia from './HuecoEvidencia'
import { ID_NO_CONCLUYENTE, TITULO_NO_CONCLUYENTE, type ValorEvidencia } from './valorEvidencia'
import ResumenEvidencia, { type AccionesEvidencia } from './ResumenEvidencia'

const valorDe = (h: HipotesisFitosanitaria): ValorEvidencia => ({
  clave: h.clave,
  categoria: h.categoria,
  nombre: h.nombre,
  plaga_id: h.plaga_id,
})
const VALOR_NO_CONCLUYENTE: ValorEvidencia = {
  clave: null,
  categoria: null,
  nombre: null,
  plaga_id: null,
}

const rechazo = (detalle: string) => new ErrorApi(422, 'validacion-evidencia', detalle)

/** Cuerpo de `validar/` a partir de las decisiones; lanza un 422 con el motivo si no hay una única opción válida. */
export function cuerpoDesdeDecisiones(
  hipotesis: readonly HipotesisFitosanitaria[],
  decisiones: Record<string, DecisionElemento<ValorEvidencia>>,
): CuerpoValidacionEvidencia {
  const elegidas = Object.entries(decisiones).filter(([, d]) => d.accion !== 'descartar')
  if (elegidas.length === 0) {
    throw rechazo('Elige una hipótesis, otra categoría o «No es posible concluir».')
  }
  if (elegidas.length > 1) {
    // «Aplicar» y «Aceptar pendientes» del núcleo aceptan todo: aquí no vale, Konoha no elige por la persona.
    throw rechazo(
      'Elige una sola opción: en «Corregir», acepta una hipótesis, corrígela a otra categoría o elige «No es posible concluir», y descarta las demás.',
    )
  }
  const [id, decision] = elegidas[0]
  const comentario = decision.comentario ?? ''
  let formulario: FormularioValidacion
  if (id === ID_NO_CONCLUYENTE) {
    formulario = { ...FORMULARIO_VACIO, opcion: 'no-concluyente', comentario }
  } else if (decision.accion === 'corregir') {
    const final = decision.valorFinal
    // Sin tocar el hueco, el valor sigue siendo la hipótesis (con su `clave`): aún no hay otra categoría.
    if (!final || final.clave !== null) throw rechazo('Elige la otra categoría de afectación.')
    formulario = {
      ...FORMULARIO_VACIO,
      opcion: 'otra',
      categoria: final.categoria,
      plaga_id: final.plaga_id,
      nombre: final.nombre ?? '',
      comentario,
    }
  } else {
    formulario = { ...FORMULARIO_VACIO, opcion: `hipotesis:${id}`, comentario }
  }
  const { cuerpo, errores } = cuerpoValidacion(formulario, hipotesis)
  if (!cuerpo) throw rechazo(errores.categoria ?? errores.opcion ?? 'Revisa la validación técnica.')
  return cuerpo
}

function registroDe(s: SugerenciaEvidencia, h: HipotesisFitosanitaria | null): RegistroDecision<ValorEvidencia> | null {
  const { validacion } = s.contenido
  if (!validacion || s.estado !== 'Validada') return null
  const esta = h === null ? validacion.resultado === 'NoConcluyente' : validacion.hipotesis_clave === h.clave
  if (!esta) return null
  return {
    accion: 'aceptar',
    valorFinal: h === null ? VALOR_NO_CONCLUYENTE : valorDe(h),
    comentario: validacion.comentario ?? undefined,
    decididoPor: s.contenido.validada_por ?? 'la jefatura de sección',
    decididoEn: s.fecha_validacion ?? s.fecha_modificacion ?? '',
  }
}

function aRevision(s: SugerenciaEvidencia, acciones: AccionesEvidencia): PropuestaRevision<ValorEvidencia> {
  const { contenido } = s
  const hipotesis = ordenarHipotesis(contenido.hipotesis)
  const elementos: ElementoRevision<ValorEvidencia>[] = hipotesis.map((h) => ({
    id: h.clave,
    titulo: h.nombre,
    sugerencia: `${ETIQUETA_CATEGORIA[h.categoria]} · Confianza ${textoConfianza(h)}`,
    valorSugerido: valorDe(h),
    decision: registroDe(s, h),
  }))
  // Una evaluación manual no trae hipótesis: solo se ve lo que se registró, sin elementos que decidir.
  if (contenido.origen === 'ia') {
    elementos.push({
      id: ID_NO_CONCLUYENTE,
      titulo: TITULO_NO_CONCLUYENTE,
      sugerencia: 'Dejar el análisis pendiente de diagnóstico, sin elegir ninguna hipótesis.',
      valorSugerido: VALOR_NO_CONCLUYENTE,
      decision: registroDe(s, null),
    })
  }
  // El análisis manual no pasó por la IA: se rellena lo que el núcleo muestra siempre.
  const ia = contenido.ia ?? {
    proveedor: 'Sin IA',
    modelo: 'evaluación manual',
    solicitado_en: s.fecha_creacion ?? '',
    duracion_ms: 0,
  }
  return {
    id: s.id,
    estado: s.estado,
    resumen: createElement(ResumenEvidencia, { sugerencia: s, acciones }),
    ia,
    contexto: {
      suficiencia: contenido.suficiencia ?? 'suficiente',
      faltantes: contenido.faltantes ?? [],
      datos_utilizados: contenido.datos_utilizados ?? [],
      limitaciones: contenido.limitaciones ?? [],
      explicacion: contenido.explicacion ?? '',
    },
    elementos,
    validadaPor: s.estado === 'Propuesta' ? null : (contenido.validada_por ?? 'la jefatura de sección'),
    validadaEn: s.fecha_validacion,
    motivoRechazo: null,
  }
}

export interface OpcionesAdaptadorEvidencia {
  id: number
  /** Acciones del resumen (nuevas fotos, evaluación manual) y permisos: las posee el bloque. */
  acciones: AccionesEvidencia
  /** Tras validar o descartar: el bloque vuelve a leer. */
  alCambio: () => void
}

export function crearAdaptadorEvidencia({
  id,
  acciones,
  alCambio,
}: OpcionesAdaptadorEvidencia): AdaptadorRevision<ValorEvidencia> {
  // El análisis de la última carga: la validación necesita sus hipótesis y la evaluación manual, su planta.
  let actual: SugerenciaEvidencia | null = null
  return {
    clave: `evidencia-konoha|${id}`,
    tituloFaltantes: 'Faltan datos para un análisis confiable',
    motivoRechazo: 'opcional',
    cargar: async (signal) => {
      const analisis = await obtenerAnalisisEvidencia(id, signal)
      actual = analisis
      return aRevision(analisis, acciones)
    },
    validar: async (decisiones) => {
      await validarEvidencia(id, cuerpoDesdeDecisiones(actual?.contenido.hipotesis ?? [], decisiones))
      alCambio()
    },
    rechazar: async (motivo) => {
      await descartarEvidencia(id, motivo || null)
      alCambio()
    },
    alternativaManual: {
      texto: 'Registrar evaluación manual',
      alElegir: () => actual && acciones.registrarManual(actual),
    },
    renderHueco: (contexto) => createElement(HuecoEvidencia, { contexto }),
    mostrarValor: (valor) =>
      valor.nombre === null && valor.categoria === null
        ? TITULO_NO_CONCLUYENTE
        : [valor.categoria && ETIQUETA_CATEGORIA[valor.categoria], valor.nombre].filter(Boolean).join(' · '),
  }
}
