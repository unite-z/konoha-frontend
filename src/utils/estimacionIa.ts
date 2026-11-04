/**
 * Lógica pura de RF-IA-004 (estimación de recursos y duración con IA): textos con unidades, el cálculo de la
 * diferencia entre lo estimado y lo confirmado (criterio 2), la validación de los valores confirmados y el resumen
 * de la lista. Los datos simulados usan las mismas funciones.
 */
import type { AccionDecision, EstadoSugerencia } from '../types/ia'
import type {
  ContenidoEstimacion,
  DiferenciaEstimacion,
  EstimacionRecursos,
  Insumo,
  RecursosConfirmados,
  UnidadDuracion,
} from '../types/estimacionIa'
import { formatearNumero } from './formato'

/** Horas de una jornada para comparar duraciones en unidades distintas. SUPUESTO (pendiente del backend): 8 h. */
export const HORAS_POR_JORNADA = 8

const plural = (n: number, uno: string, varios: string) => `${formatearNumero(n)} ${n === 1 ? uno : varios}`

/** «Entre 2 y 4 · sugeridos 3 operarios», o «3 operarios» si el rango es un solo valor. */
export function textoOperarios(est: Pick<EstimacionRecursos, 'operarios_min' | 'operarios_max' | 'operarios_sugeridos'>): string {
  if (est.operarios_min === est.operarios_max) return plural(est.operarios_sugeridos, 'operario', 'operarios')
  return `Entre ${formatearNumero(est.operarios_min)} y ${formatearNumero(est.operarios_max)} · sugeridos ${plural(est.operarios_sugeridos, 'operario', 'operarios')}`
}

/** «6 horas», «1 jornada». */
export function textoDuracion(valor: number, unidad: UnidadDuracion): string {
  return unidad === 'horas' ? plural(valor, 'hora', 'horas') : plural(valor, 'jornada', 'jornadas')
}

/** «Fertilizante NPK 20-20-20 · 5 kg». */
export function textoInsumo(insumo: Insumo): string {
  return `${insumo.nombre} · ${formatearNumero(insumo.cantidad)} ${insumo.unidad}`.trim()
}

const claveInsumo = (i: Pick<Insumo, 'nombre' | 'unidad'>) => `${i.nombre.trim().toLowerCase()}|${i.unidad.trim().toLowerCase()}`

const aHoras = (valor: number, unidad: UnidadDuracion) => (unidad === 'jornadas' ? valor * HORAS_POR_JORNADA : valor)

/**
 * Confirmado − estimado. Los insumos se comparan por nombre y unidad: uno nuevo cuenta entero (+), uno quitado cuenta
 * entero (−) y los que no cambian no aparecen. La duración se compara en la unidad de la estimación.
 */
export function calcularDiferencia(estimacion: EstimacionRecursos | null, confirmado: RecursosConfirmados): DiferenciaEstimacion {
  const operarios = estimacion && confirmado.operarios !== null ? confirmado.operarios - estimacion.operarios_sugeridos : null
  let duracion: number | null = null
  if (estimacion && confirmado.duracion !== null) {
    const confirmadaEnHoras = aHoras(confirmado.duracion, confirmado.unidad_duracion ?? estimacion.unidad_duracion)
    const estimadaEnHoras = aHoras(estimacion.duracion, estimacion.unidad_duracion)
    const diferenciaHoras = confirmadaEnHoras - estimadaEnHoras
    duracion = Math.round((estimacion.unidad_duracion === 'jornadas' ? diferenciaHoras / HORAS_POR_JORNADA : diferenciaHoras) * 100) / 100
  }
  const totales = new Map<string, { nombre: string; unidad: string; diferencia: number }>()
  for (const i of estimacion?.insumos ?? []) {
    totales.set(claveInsumo(i), { nombre: i.nombre, unidad: i.unidad, diferencia: -i.cantidad })
  }
  for (const i of confirmado.insumos) {
    const actual = totales.get(claveInsumo(i))
    totales.set(claveInsumo(i), { nombre: i.nombre, unidad: i.unidad, diferencia: (actual?.diferencia ?? 0) + i.cantidad })
  }
  const insumos = [...totales.values()]
    .map((i) => ({ ...i, diferencia: Math.round(i.diferencia * 1000) / 1000 }))
    .filter((i) => i.diferencia !== 0)
  return { operarios, duracion, insumos }
}

/** «+1 operario», «−2 h», «Sin diferencia». */
export function textoDiferencia(valor: number | null, unidad: string): string {
  if (valor === null) return '—'
  if (valor === 0) return 'Sin diferencia'
  const signo = valor > 0 ? '+' : '−'
  return `${signo}${formatearNumero(Math.abs(valor))} ${unidad}`.trim()
}

/** Errores de los valores confirmados (por campo y, en los insumos, por fila). */
export interface ErroresConfirmados {
  operarios?: string
  duracion?: string
  insumos?: Record<number, { nombre?: string; cantidad?: string; unidad?: string }>
}

/** Operarios enteros ≥ 1, duración > 0 e insumos con nombre, cantidad ≥ 0 y unidad. `null` = no se confirma. */
export function validarConfirmados(confirmado: RecursosConfirmados): ErroresConfirmados {
  const errores: ErroresConfirmados = {}
  if (confirmado.operarios !== null && (!Number.isInteger(confirmado.operarios) || confirmado.operarios < 1)) {
    errores.operarios = 'Indica un número entero de operarios, 1 como mínimo'
  }
  if (confirmado.duracion !== null && !(confirmado.duracion > 0)) errores.duracion = 'Indica una duración mayor que 0'
  const insumos: NonNullable<ErroresConfirmados['insumos']> = {}
  confirmado.insumos.forEach((i, indice) => {
    const fila: { nombre?: string; cantidad?: string; unidad?: string } = {}
    if (!i.nombre.trim()) fila.nombre = 'Indica el insumo'
    if (!Number.isFinite(i.cantidad) || i.cantidad < 0) fila.cantidad = 'Indica una cantidad de 0 o más'
    if (!i.unidad.trim()) fila.unidad = 'Indica la unidad'
    if (Object.keys(fila).length > 0) insumos[indice] = fila
  })
  if (Object.keys(insumos).length > 0) errores.insumos = insumos
  return errores
}

export const hayErrores = (e: ErroresConfirmados) => Boolean(e.operarios || e.duracion || e.insumos)

/** Texto de un número escrito por la persona («2,5» o «2.5»); `null` si está vacío o no es un número. */
export function leerNumero(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.')
  if (limpio === '') return null
  const numero = Number(limpio)
  return Number.isFinite(numero) ? numero : null
}

/** Decisión en curso de un bloque y su valor corregido. */
export interface DecisionesEnCurso {
  operarios?: AccionDecision
  duracion?: AccionDecision
  insumos?: AccionDecision
  /** Valores escritos al corregir. */
  corregido: RecursosConfirmados
}

/** Lo que se confirmaría con las decisiones: aceptar = lo estimado; corregir = lo escrito; descartar = nada. */
export function confirmadoDesdeDecisiones(estimacion: EstimacionRecursos, d: DecisionesEnCurso): RecursosConfirmados {
  return {
    operarios: d.operarios === 'aceptar' ? estimacion.operarios_sugeridos : d.operarios === 'corregir' ? d.corregido.operarios : null,
    duracion: d.duracion === 'aceptar' ? estimacion.duracion : d.duracion === 'corregir' ? d.corregido.duracion : null,
    unidad_duracion:
      d.duracion === 'aceptar' ? estimacion.unidad_duracion : d.duracion === 'corregir' ? (d.corregido.unidad_duracion ?? estimacion.unidad_duracion) : null,
    insumos: d.insumos === 'aceptar' ? estimacion.insumos : d.insumos === 'corregir' ? d.corregido.insumos : [],
  }
}

/** «3 operarios · 6 h · 2 insumos» con lo confirmado (si lo hay) o lo estimado; «Sin recomendación» si no hay nada. */
export function resumenEstimacion(contenido: Pick<ContenidoEstimacion, 'estimacion' | 'decision'>): string {
  const base = contenido.decision?.confirmado ?? (contenido.estimacion && {
    operarios: contenido.estimacion.operarios_sugeridos,
    duracion: contenido.estimacion.duracion,
    unidad_duracion: contenido.estimacion.unidad_duracion,
    insumos: contenido.estimacion.insumos,
  })
  if (!base) return 'Sin recomendación'
  const partes = [
    base.operarios !== null && plural(base.operarios, 'operario', 'operarios'),
    base.duracion !== null && `${formatearNumero(base.duracion)} ${base.unidad_duracion === 'jornadas' ? 'jorn.' : 'h'}`,
    plural(base.insumos.length, 'insumo', 'insumos'),
  ]
  return partes.filter(Boolean).join(' · ')
}

/** Unidades para sugerir al escribir un insumo: las de la estimación más las habituales. */
export function unidadesSugeridas(insumos: Insumo[]): string[] {
  return [...new Set([...insumos.map((i) => i.unidad), 'kg', 'L', 'u', 'm²', 'sacos'])].filter(Boolean)
}

/** Tono del componente `Estado` (sin importar de `components/ui`: utils no depende del sistema de diseño). */
type TonoEstadoEstimacion = 'neutro' | 'aviso' | 'exito'

/** Estado de una estimación con el componente `Estado`: pendiente, confirmada o descartada. */
export function estadoEstimacion(estado: EstadoSugerencia): { tono: TonoEstadoEstimacion; texto: string } {
  if (estado === 'Validada') return { tono: 'exito', texto: 'Confirmada' }
  if (estado === 'Rechazada') return { tono: 'neutro', texto: 'Descartada' }
  return { tono: 'aviso', texto: 'Pendiente de revisión' }
}

/** Insumo mientras se escribe (la cantidad en texto, para admitir «0,5»). */
export interface InsumoEnEdicion {
  nombre: string
  cantidad: string
  unidad: string
}

/** Recursos mientras se escriben (formulario manual y corrección). */
export interface RecursosEnEdicion {
  operarios: string
  duracion: string
  unidad_duracion: UnidadDuracion
  insumos: InsumoEnEdicion[]
}

export function aInsumosEnEdicion(insumos: Insumo[]): InsumoEnEdicion[] {
  return insumos.map((i) => ({ nombre: i.nombre, cantidad: String(i.cantidad).replace('.', ','), unidad: i.unidad }))
}

/** Insumos escritos → valores; una cantidad no numérica queda como `NaN` para que la validación la señale. */
export function deInsumosEnEdicion(insumos: InsumoEnEdicion[]): Insumo[] {
  return insumos.map((i) => ({ nombre: i.nombre.trim(), cantidad: leerNumero(i.cantidad) ?? Number.NaN, unidad: i.unidad.trim() }))
}

/** Recursos escritos → valores confirmados (vacío = `null`). */
export function deRecursosEnEdicion(r: RecursosEnEdicion): RecursosConfirmados {
  const operarios = leerNumero(r.operarios)
  const duracion = leerNumero(r.duracion)
  return {
    operarios: r.operarios.trim() === '' ? null : (operarios ?? Number.NaN),
    duracion: r.duracion.trim() === '' ? null : (duracion ?? Number.NaN),
    unidad_duracion: r.duracion.trim() === '' ? null : r.unidad_duracion,
    insumos: deInsumosEnEdicion(r.insumos),
  }
}

/** Recursos vacíos para el formulario manual (E1 y A1). */
export function recursosVacios(unidad: UnidadDuracion = 'horas'): RecursosEnEdicion {
  return { operarios: '', duracion: '', unidad_duracion: unidad, insumos: [] }
}

export const OPCIONES_UNIDAD: { valor: UnidadDuracion; texto: string }[] = [
  { valor: 'horas', texto: 'Horas' },
  { valor: 'jornadas', texto: 'Jornadas' },
]
