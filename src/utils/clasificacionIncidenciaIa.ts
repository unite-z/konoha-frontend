/**
 * Lógica pura de RF-IA-005 (clasificación y priorización de incidencias con IA): textos e insignias de severidad, las
 * decisiones por campo y los valores que se registran. Tipo de evento, severidad y tipo de atención son obligatorios:
 * si se descartan, hay que elegir un valor (la clasificación queda completa). La incidencia nunca se deriva aquí.
 */
import type { AccionDecision } from '../types/ia'
import type {
  CampoClasificacion,
  CuerpoValidacionClasificacion,
  Severidad,
  TipoEvento,
  ValoresClasificacion,
  ViaAtencion,
} from '../types/clasificacionIncidenciaIa'

export const TIPOS_EVENTO: readonly TipoEvento[] = ['Incidencia', 'Reclamo', 'No conformidad', 'Hallazgo de supervisión', 'Hallazgo de auditoría']
export const SEVERIDADES: readonly Severidad[] = ['Alta', 'Media', 'Baja']

export const ETIQUETA_VIA_ATENCION: Record<ViaAtencion, string> = {
  PersonalPropio: 'Personal propio',
  Tercerizado: 'Servicio especializado',
}

export const OPCIONES_VIA_ATENCION: { valor: ViaAtencion; texto: string; descripcion: string }[] = [
  { valor: 'PersonalPropio', texto: 'Personal propio', descripcion: 'La atiende una cuadrilla de la sección' },
  { valor: 'Tercerizado', texto: 'Servicio especializado (tercerizado)', descripcion: 'La atiende un proveedor contratado' },
]

/** Tono del componente `Estado` (sin importar de `components/ui`). */
type TonoSeveridad = 'error' | 'aviso' | 'neutro'
/** Nombre de icono de lucide (`Icono`). */
type IconoSeveridad = 'triangle-alert' | 'info'

/** Severidad como en el mockup: Alta en rojo con triángulo, Media en ámbar con alerta y Baja neutra con punto. */
export function insigniaSeveridad(severidad: Severidad): { tono: TonoSeveridad; texto: string; icono?: IconoSeveridad } {
  if (severidad === 'Alta') return { tono: 'error', texto: 'Alta', icono: 'triangle-alert' }
  if (severidad === 'Media') return { tono: 'aviso', texto: 'Media', icono: 'info' }
  return { tono: 'neutro', texto: 'Baja' }
}

export const ETIQUETA_CAMPO: Record<CampoClasificacion, string> = {
  tipo_evento: 'Categoría',
  categoria: 'Subcategoría',
  severidad: 'Prioridad',
  via_atencion: 'Tipo de atención',
  es_sencilla: 'Incidencia sencilla',
}

/** Campos que la clasificación necesita siempre. */
export const CAMPOS_OBLIGATORIOS: readonly CampoClasificacion[] = ['tipo_evento', 'severidad', 'via_atencion']

/** Id de la ficha de un campo en la revisión (para llevar el foco desde el resumen de errores). */
export const idFicha = (campo: CampoClasificacion) => `ficha-${campo}`

/** Orden de los campos en la revisión. */
export const CAMPOS: readonly CampoClasificacion[] = ['tipo_evento', 'categoria', 'severidad', 'via_atencion', 'es_sencilla']

/** Decisión en curso de un campo (el valor solo cuenta al corregir). */
export interface DecisionEnCursoCampo {
  accion?: AccionDecision
  valor: string | boolean | null
}

/** Campos que se deciden: los que la IA sugiere más los obligatorios (aunque la IA no los sugiera). */
export function camposADecidir(sugerencia: ValoresClasificacion | null): CampoClasificacion[] {
  return CAMPOS.filter((c) => CAMPOS_OBLIGATORIOS.includes(c) || (sugerencia !== null && sugerencia[c] !== null))
}

export const MENSAJES_CLASIFICACION = {
  sinDecision: 'Elige aceptar, corregir o descartar',
  sinValor: 'Elige el valor',
  obligatorio: 'Este campo es obligatorio: corrígelo con un valor',
  sinSugerencia: 'La IA no lo sugirió: corrígelo con un valor',
} as const

/** Errores por campo antes de registrar (faltan decisiones, valores o un obligatorio queda vacío). */
export function camposSinDecidir(
  sugerencia: ValoresClasificacion | null,
  decisiones: Partial<Record<CampoClasificacion, DecisionEnCursoCampo>>,
): Partial<Record<CampoClasificacion, string>> {
  const errores: Partial<Record<CampoClasificacion, string>> = {}
  for (const campo of camposADecidir(sugerencia)) {
    const d = decisiones[campo]
    const obligatorio = CAMPOS_OBLIGATORIOS.includes(campo)
    const sugerido = sugerencia?.[campo] ?? null
    if (!d?.accion) errores[campo] = MENSAJES_CLASIFICACION.sinDecision
    else if (d.accion === 'corregir' && (d.valor === null || d.valor === '')) errores[campo] = MENSAJES_CLASIFICACION.sinValor
    else if (d.accion === 'descartar' && obligatorio) errores[campo] = MENSAJES_CLASIFICACION.obligatorio
    else if (d.accion === 'aceptar' && sugerido === null) errores[campo] = MENSAJES_CLASIFICACION.sinSugerencia
  }
  return errores
}

/** Valores que se registran: aceptado = sugerido; corregido = el valor elegido; descartado o sin decidir = null. */
export function valoresRegistrados(
  sugerencia: ValoresClasificacion | null,
  decisiones: Partial<Record<CampoClasificacion, DecisionEnCursoCampo>>,
): ValoresClasificacion {
  const valor = <C extends CampoClasificacion>(campo: C): ValoresClasificacion[C] | null => {
    const d = decisiones[campo]
    if (d?.accion === 'aceptar') return sugerencia?.[campo] ?? null
    if (d?.accion === 'corregir') return d.valor as ValoresClasificacion[C]
    return null
  }
  return {
    tipo_evento: valor('tipo_evento'),
    categoria: valor('categoria'),
    severidad: valor('severidad'),
    via_atencion: valor('via_atencion'),
    es_sencilla: valor('es_sencilla'),
  }
}

/** Cuerpo de `validar/`, o `null` si falta algo. */
export function cuerpoValidacion(
  sugerencia: ValoresClasificacion | null,
  decisiones: Partial<Record<CampoClasificacion, DecisionEnCursoCampo>>,
): CuerpoValidacionClasificacion | null {
  if (Object.keys(camposSinDecidir(sugerencia, decisiones)).length > 0) return null
  const porCampo: CuerpoValidacionClasificacion['por_campo'] = {}
  for (const campo of camposADecidir(sugerencia)) {
    const d = decisiones[campo]
    if (!d?.accion) return null
    porCampo[campo] = { accion: d.accion, valor_final: d.accion === 'corregir' ? d.valor : null }
  }
  return { por_campo: porCampo }
}

/** Texto de un valor de clasificación («Servicio especializado», «Sí»…). */
export function textoValor(campo: CampoClasificacion, valor: ValoresClasificacion[CampoClasificacion]): string {
  if (valor === null || valor === '') return 'Sin valor'
  if (campo === 'via_atencion') return ETIQUETA_VIA_ATENCION[valor as ViaAtencion] ?? String(valor)
  if (campo === 'es_sencilla') return valor ? 'Sí, se atiende en 48 horas como máximo' : 'No'
  return String(valor)
}

/** «Categoría: Incidencia · Prioridad: Alta · Atención: Servicio especializado». */
export function resumenClasificacion(valores: ValoresClasificacion): string {
  return [
    valores.tipo_evento && `Categoría: ${valores.tipo_evento}${valores.categoria ? ` (${valores.categoria})` : ''}`,
    valores.severidad && `Prioridad: ${valores.severidad}`,
    valores.via_atencion && `Atención: ${ETIQUETA_VIA_ATENCION[valores.via_atencion]}`,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** «Alta · Servicio especializado» (para la lista de análisis). */
export function resumenCorto(valores: ValoresClasificacion | null): string {
  if (!valores) return 'Sin sugerencia'
  return [valores.severidad, valores.via_atencion && ETIQUETA_VIA_ATENCION[valores.via_atencion]].filter(Boolean).join(' · ') || 'Sin sugerencia'
}

/** Errores de la clasificación manual: los obligatorios con valor. */
export function validarManual(valores: ValoresClasificacion): Partial<Record<CampoClasificacion, string>> {
  const errores: Partial<Record<CampoClasificacion, string>> = {}
  for (const campo of CAMPOS_OBLIGATORIOS) if (valores[campo] === null) errores[campo] = MENSAJES_CLASIFICACION.sinValor
  return errores
}

export const VALORES_VACIOS: ValoresClasificacion = { tipo_evento: null, categoria: null, severidad: null, via_atencion: null, es_sencilla: null }

/** Estado de un análisis con el componente `Estado`. */
export function estadoClasificacion(estado: 'Propuesta' | 'Validada' | 'Rechazada'): { tono: 'aviso' | 'exito' | 'neutro'; texto: string } {
  if (estado === 'Validada') return { tono: 'exito', texto: 'Clasificada' }
  if (estado === 'Rechazada') return { tono: 'neutro', texto: 'Sugerencia descartada' }
  return { tono: 'aviso', texto: 'Pendiente de revisión' }
}
