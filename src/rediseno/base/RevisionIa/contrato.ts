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

/** Parámetros de entrada que el historial lee de la URL y pasa al adaptador (contrato que no se rompe, IA-16). */
export const PARAMETROS_ENTRADA_HISTORIAL = ['incidencia_id', 'ejemplar_id', 'atencion_id', 'actividad_id'] as const
export type ParametrosEntradaHistorial = Partial<Record<(typeof PARAMETROS_ENTRADA_HISTORIAL)[number], string>>

/** Tamaño de página de las listas de propuestas del back-end (Guía Web 5.5). */
export const POR_PAGINA_HISTORIAL = 25

/** Fila del «Historial de Konoha»: una propuesta con su estado y, si se decidió, quién y cuándo. */
export interface EntradaHistorial {
  id: number
  estado: EstadoSugerencia
  /** `etiqueta_estado` del back-end; sin ella, el texto común del estado. */
  etiquetaEstado?: string | null
  titulo: ReactNode
  /** Datos propios de la fila que hoy se ven en la bandeja: periodo, n.º de propuestas, suficiencia, decisión… */
  resumen?: ReactNode
  solicitadaEn: InstanteIso
  decididaPor: string | null
  decididaEn: InstanteIso | null
}

/** Filtro propio de cada asistente (periodo, tipo de hallazgo, conjunto…), en la URL con su `clave`. */
export interface FiltroHistorial {
  clave: string
  etiqueta: string
  opciones: { valor: string; texto: string }[]
}

export interface ConsultaHistorial {
  estado: EstadoSugerencia | null
  filtros: Record<string, string>
  entrada: ParametrosEntradaHistorial
  /** Página pedida, desde 1 (`?page=` como hoy). */
  pagina: number
}

/** Una página de la lista del back-end (`count` y `results`). */
export interface PaginaHistorial {
  entradas: EntradaHistorial[]
  total: number
}

export interface AdaptadorHistorial {
  /** Identifica el asistente en la clave de consulta y en el nombre de transición de cada fila. */
  clave: string
  filtros?: FiltroHistorial[]
  /** Texto de cada estado en los chips, como hoy en su bandeja («Confirmadas», «Descartadas»…). */
  textosEstado?: Partial<Record<EstadoSugerencia, string>>
  /** Estado que se ve sin `?estado=` (inconsistencias abre en las pendientes); por defecto, todas. */
  estadoInicial?: EstadoSugerencia
  porPagina?: number
  cargar: (consulta: ConsultaHistorial, signal: AbortSignal) => Promise<PaginaHistorial>
  /** Recuento por estado con los mismos filtros, si el asistente lo muestra hoy (inconsistencias). */
  contar?: (
    consulta: Omit<ConsultaHistorial, 'estado' | 'pagina'>,
    signal: AbortSignal,
  ) => Promise<Partial<Record<EstadoSugerencia, number>>>
  /** Detalle de una propuesta (normalmente `RevisionIa`, que en las decididas muestra quién decidió cada elemento y cuándo). */
  renderDetalle: (entrada: EntradaHistorial) => ReactNode
}
