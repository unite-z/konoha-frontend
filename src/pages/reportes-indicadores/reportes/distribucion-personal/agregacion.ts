/**
 * Agregación de las filas de RF-REP-004 (jornada × cuadrilla × tipo de actividad × espacio) para los gráficos.
 *
 * - Operarios: distintos dentro del grupo (cada operario cuenta una vez aunque esté en varias filas), igual que
 *   los totales del back-end.
 * - Tiempo, horas-persona y superficie: suma de las filas con valor; nulo si ninguna fila lo tiene.
 * - Sin tiempo registrado: el back-end deja `tiempo_minutos` nulo solo si ninguna actividad de la fila tiene
 *   tiempo, así que el filtro trabaja con esas filas.
 */
import type { FilaDistribucion } from '../../../../types/reportes'
import { escalaRedonda } from '../../../../components/reportes-indicadores/graficos/escala'
import { formatearFecha, formatearMinutos, formatearNumero, SIN_VALOR } from '../../../../utils/formato'

export type Dimension = 'cuadrilla' | 'actividad' | 'espacio' | 'jornada'

export type Medida = 'horas_persona' | 'operarios' | 'tiempo_minutos' | 'superficie_m2' | 'numero_actividades'

export const DIMENSIONES: { valor: Dimension; texto: string }[] = [
  { valor: 'cuadrilla', texto: 'Cuadrilla' },
  { valor: 'actividad', texto: 'Actividad' },
  { valor: 'espacio', texto: 'Espacio' },
  { valor: 'jornada', texto: 'Jornada' },
]

export const MEDIDAS: { valor: Medida; texto: string }[] = [
  { valor: 'horas_persona', texto: 'Horas-persona' },
  { valor: 'operarios', texto: 'Operarios' },
  { valor: 'tiempo_minutos', texto: 'Tiempo' },
  { valor: 'superficie_m2', texto: 'Superficie' },
  { valor: 'numero_actividades', texto: 'Actividades' },
]

/** Medidas que dependen del tiempo registrado (no hay datos con el filtro «sin tiempo»). */
export const MEDIDAS_CON_TIEMPO: Medida[] = ['horas_persona', 'tiempo_minutos']

export interface Totales {
  operarios: number
  horas_persona: number | null
  tiempo_minutos: number | null
  superficie_m2: number | null
  numero_actividades: number
}

export interface Grupo {
  clave: string
  texto: string
  filas: FilaDistribucion[]
  totales: Totales
  /** Tipos de actividad de una clase (solo en la dimensión «actividad»). */
  subgrupos?: Grupo[]
}

function sumaONulo(valores: (number | null)[]): number | null {
  const conValor = valores.filter((v): v is number => v !== null)
  if (conValor.length === 0) return null
  return Math.round(conValor.reduce((a, b) => a + b, 0) * 100) / 100
}

export function totalizar(filas: FilaDistribucion[]): Totales {
  const operarios = new Set<number>()
  for (const f of filas) for (const o of f.operarios) operarios.add(o.operario_id)
  return {
    operarios: operarios.size,
    horas_persona: sumaONulo(filas.map((f) => f.horas_persona)),
    tiempo_minutos: sumaONulo(filas.map((f) => f.tiempo_minutos)),
    superficie_m2: sumaONulo(filas.map((f) => f.superficie_m2)),
    numero_actividades: filas.reduce((a, f) => a + f.numero_actividades, 0),
  }
}

export function valorMedida(totales: Totales, medida: Medida): number | null {
  return totales[medida]
}

export function formatearMedida(valor: number | null, medida: Medida): string {
  if (valor === null) return SIN_VALOR
  switch (medida) {
    case 'horas_persona':
      return `${formatearNumero(valor, 2)} h`
    case 'tiempo_minutos':
      return formatearMinutos(valor)
    case 'superficie_m2':
      return `${formatearNumero(valor)} m²`
    default:
      return formatearNumero(valor)
  }
}

/** Clave y texto del grupo de una fila en cada dimensión (los vacíos se agrupan como «Sin …»). */
function claveYTexto(fila: FilaDistribucion, dimension: Dimension | 'tipo'): [string, string] {
  switch (dimension) {
    case 'cuadrilla':
      return [String(fila.cuadrilla_id), fila.cuadrilla_nombre ?? 'Sin cuadrilla']
    case 'actividad':
      return [String(fila.clase_actividad_id), fila.clase_actividad_nombre ?? 'Sin clase de actividad']
    case 'tipo':
      return [String(fila.tipo_actividad_id), fila.tipo_actividad_nombre ?? 'Sin tipo de actividad']
    case 'espacio':
      return [String(fila.area_verde_id), fila.area_verde_nombre ?? 'Sin espacio']
    case 'jornada':
      return [fila.jornada, formatearFecha(fila.jornada)]
  }
}

function agruparPor(filas: FilaDistribucion[], dimension: Dimension | 'tipo'): Grupo[] {
  const mapa = new Map<string, { texto: string; filas: FilaDistribucion[] }>()
  for (const fila of filas) {
    const [clave, texto] = claveYTexto(fila, dimension)
    const grupo = mapa.get(clave)
    if (grupo) grupo.filas.push(fila)
    else mapa.set(clave, { texto, filas: [fila] })
  }
  return [...mapa.entries()].map(([clave, g]) => ({ clave, texto: g.texto, filas: g.filas, totales: totalizar(g.filas) }))
}

function compararTexto(a: Grupo, b: Grupo): number {
  return a.texto.localeCompare(b.texto, 'es', { numeric: true })
}

/** De mayor a menor según la medida; los empates, por nombre. */
function ordenarPorMedida(grupos: Grupo[], medida: Medida): Grupo[] {
  return [...grupos].sort(
    (a, b) => (valorMedida(b.totales, medida) ?? 0) - (valorMedida(a.totales, medida) ?? 0) || compararTexto(a, b),
  )
}

/**
 * Grupos de la dimensión, ordenados: la jornada por fecha; el resto, de mayor a menor según la medida.
 * En «actividad», cada clase lleva sus tipos como subgrupos (barras agrupadas).
 */
export function agrupar(filas: FilaDistribucion[], dimension: Dimension, medida: Medida): Grupo[] {
  const grupos = agruparPor(filas, dimension)
  if (dimension === 'jornada') return grupos.sort((a, b) => a.clave.localeCompare(b.clave))
  if (dimension === 'actividad') {
    for (const clase of grupos) clase.subgrupos = ordenarPorMedida(agruparPor(clase.filas, 'tipo'), medida)
  }
  return ordenarPorMedida(grupos, medida)
}

export interface MatrizCuadrillaJornada {
  cuadrillas: { clave: string; texto: string }[]
  jornadas: string[]
  /** Celda por `${cuadrilla}|${jornada}`; sin entrada si la cuadrilla no tuvo actividades ese día. */
  celdas: Map<string, Grupo>
}

export function claveCelda(cuadrilla: string, jornada: string): string {
  return `${cuadrilla}|${jornada}`
}

/** Matriz del mapa de calor: cuadrillas por nombre y jornadas por fecha. */
export function matrizCuadrillaJornada(filas: FilaDistribucion[]): MatrizCuadrillaJornada {
  const cuadrillas = agruparPor(filas, 'cuadrilla').sort(compararTexto)
  const jornadas = [...new Set(filas.map((f) => f.jornada))].sort()
  const celdas = new Map<string, Grupo>()
  for (const cuadrilla of cuadrillas) {
    for (const dia of agruparPor(cuadrilla.filas, 'jornada')) {
      celdas.set(claveCelda(cuadrilla.clave, dia.clave), dia)
    }
  }
  return { cuadrillas: cuadrillas.map(({ clave, texto }) => ({ clave, texto })), jornadas, celdas }
}

/** Nivel de intensidad del mapa de calor: 0 sin valor; 1 a 4 en cuartos del máximo. */
export function nivelIntensidad(valor: number | null, maximo: number): 0 | 1 | 2 | 3 | 4 {
  if (valor === null || valor <= 0 || maximo <= 0) return 0
  return Math.min(4, Math.max(1, Math.ceil((valor / maximo) * 4))) as 1 | 2 | 3 | 4
}

/** Filas cuyas actividades no tienen tiempo registrado. */
export function filasSinTiempo(filas: FilaDistribucion[]): FilaDistribucion[] {
  return filas.filter((f) => f.tiempo_minutos === null)
}

/** Cuadrillas distintas presentes en las filas. */
export function cuadrillasDistintas(filas: FilaDistribucion[]): number {
  return new Set(filas.map((f) => f.cuadrilla_id)).size
}

/**
 * Escala redonda del eje (≥ máximo) para la medida: conteos con pasos enteros y el tiempo en horas completas.
 */
export function escalaEje(maximo: number, medida: Medida): number {
  return escalaRedonda(maximo, {
    enteros: medida === 'operarios' || medida === 'numero_actividades',
    minutos: medida === 'tiempo_minutos',
  })
}

/** Texto de una marca del eje (las horas-persona sin decimales). */
export function textoMarca(valor: number, medida: Medida): string {
  return medida === 'horas_persona' ? `${formatearNumero(valor)} h` : formatearMedida(valor, medida)
}
