/** Contrato de `RevisionIa` (RD-10): cada módulo escribe un adaptador que lo cumple; el núcleo no conoce ningún asistente. */
import type { ReactNode } from 'react'
import type { InstanteIso } from '@/types/comun'
import type { AccionDecision, EstadoSugerencia, MetadatosIA } from '@/types/ia'

export const MAX_MOTIVO_RECHAZO = 1000

/** Decisión de la persona sobre un elemento (`decisionElemento`). `valorFinal` es `null` al descartar. */
export interface DecisionElemento<V> {
  accion: AccionDecision
  valorFinal: V | null
  /** Huecos propios: el comentario al aceptar una inconsistencia y el motivo si cambia la vía. */
  comentario?: string
  motivo?: string
}

/** Decisión ya registrada: quién la tomó y cuándo. */
export interface RegistroDecision<V> extends DecisionElemento<V> {
  decididoPor: string
  decididoEn: InstanteIso
}

export interface ElementoRevision<V> {
  id: string
  titulo: string
  sugerencia: ReactNode
  valorSugerido: V
  decision: RegistroDecision<V> | null
}

export interface PropuestaRevision<V> {
  id: number
  estado: EstadoSugerencia
  resumen: ReactNode
  ia: MetadatosIA['ia']
  contexto: Pick<MetadatosIA, 'suficiencia' | 'faltantes' | 'datos_utilizados' | 'limitaciones' | 'explicacion'>
  elementos: ElementoRevision<V>[]
  validadaPor: string | null
  validadaEn: InstanteIso | null
  motivoRechazo: string | null
}

/** Lo que recibe el hueco de cada elemento mientras la persona decide. */
export interface ContextoHueco<V> {
  elemento: ElementoRevision<V>
  decision: DecisionElemento<V>
  cambiar: (parcial: Partial<DecisionElemento<V>>) => void
}

export interface AdaptadorRevision<V> {
  /** Clave de la consulta: identifica la propuesta que se revisa (por ejemplo, `priorizacion|12`). */
  clave: string
  /** Título del aviso de faltantes («Faltan datos para una priorización confiable»). */
  tituloFaltantes: string
  motivoRechazo: 'obligatorio' | 'opcional'
  /** `null` si aún no hay propuesta: se ve el estado vacío y, con permiso, «Pedir análisis». */
  cargar: (signal: AbortSignal) => Promise<PropuestaRevision<V> | null>
  validar: (decisiones: Record<string, DecisionElemento<V>>) => Promise<void>
  rechazar: (motivo: string) => Promise<void>
  solicitar?: () => Promise<void>
  alternativaManual?: { texto: string; alElegir: () => void }
  /** Campos para corregir, comentario, motivo…: lo propio de cada asistente. */
  renderHueco?: (contexto: ContextoHueco<V>) => ReactNode
  /** Cómo se muestra un valor final; por defecto, el texto del valor. */
  mostrarValor?: (valor: V) => ReactNode
}
