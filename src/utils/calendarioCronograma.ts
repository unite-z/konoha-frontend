/**
 * Lógica pura del calendario de la propuesta de cronograma (RF-IA-003), al estilo de Teams: meses, cuadrícula de un mes,
 * colocación de bloques de día completo en carriles y títulos de semana. Propia de MOD-06: un módulo no importa
 * `utils` de otro (src/README.md).
 */
import type { FechaIso } from '../types/comun'
import { aDia, deDia, fechaCorta, sumarDias } from './cronogramaIa'

const MS_DIA = 86_400_000

export interface Mes {
  anio: number
  /** 1 a 12 */
  mes: number
}

const NOMBRES_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** Mes de una fecha `AAAA-MM-DD`. */
export function mesDeFecha(fecha: FechaIso): Mes {
  return { anio: Number(fecha.slice(0, 4)), mes: Number(fecha.slice(5, 7)) }
}

/** Mes desplazado `delta` meses (puede cruzar de año). */
export function desplazarMes({ anio, mes }: Mes, delta: number): Mes {
  const indice = anio * 12 + (mes - 1) + delta
  return { anio: Math.floor(indice / 12), mes: (indice % 12) + 1 }
}

/** «noviembre de 2026» */
export function nombreMes({ anio, mes }: Mes): string {
  return `${NOMBRES_MES[mes - 1]} de ${anio}`
}

/** Cuadrícula de un mes en semanas de lunes a domingo; `null` en los huecos de otros meses. */
export function semanasDelMes({ anio, mes }: Mes): (FechaIso | null)[][] {
  const primero = Date.UTC(anio, mes - 1, 1)
  const dias = new Date(Date.UTC(anio, mes, 0)).getUTCDate()
  const hueco = (new Date(primero).getUTCDay() + 6) % 7
  const celdas: (FechaIso | null)[] = [
    ...Array.from({ length: hueco }, () => null),
    ...Array.from({ length: dias }, (_, i) => deDia(primero + i * MS_DIA)),
  ]
  while (celdas.length % 7 !== 0) celdas.push(null)
  return Array.from({ length: celdas.length / 7 }, (_, i) => celdas.slice(i * 7, i * 7 + 7))
}

/** Un bloque del calendario: una programación existente o una propuesta, de día completo. */
export interface BloqueCalendario {
  clave: string
  desde: FechaIso
  hasta: FechaIso
}

/** Bloque colocado en una semana: columna de inicio (0 = lunes), días que ocupa y carril (fila). */
export interface BloqueColocado<B extends BloqueCalendario> {
  bloque: B
  columna: number
  dias: number
  carril: number
  /** Empieza antes del lunes o acaba después del domingo (se dibuja «cortado»). */
  sigueAntes: boolean
  sigueDespues: boolean
}

const diasEntre = (a: FechaIso, b: FechaIso) => Math.round((aDia(b) - aDia(a)) / MS_DIA)

/**
 * Coloca los bloques que tocan la semana del `lunes` en carriles sin solaparse (el primero libre, como Teams):
 * por inicio y, a igualdad, el más largo primero.
 */
export function colocarEnSemana<B extends BloqueCalendario>(bloques: B[], lunes: FechaIso): BloqueColocado<B>[] {
  const domingo = sumarDias(lunes, 6)
  const visibles = bloques
    .filter((b) => b.desde <= domingo && b.hasta >= lunes)
    .sort((a, b) => a.desde.localeCompare(b.desde) || diasEntre(b.desde, b.hasta) - diasEntre(a.desde, a.hasta) || a.clave.localeCompare(b.clave))
  const finCarril: number[] = []
  return visibles.map((bloque) => {
    const inicio = Math.max(0, diasEntre(lunes, bloque.desde))
    const fin = Math.min(6, diasEntre(lunes, bloque.hasta))
    let carril = finCarril.findIndex((ultimo) => ultimo < inicio)
    if (carril === -1) carril = finCarril.length
    finCarril[carril] = fin
    return { bloque, columna: inicio, dias: fin - inicio + 1, carril, sigueAntes: bloque.desde < lunes, sigueDespues: bloque.hasta > domingo }
  })
}

/** Título de una semana: «2 – 8 nov. 2026». */
export function tituloSemana(lunes: FechaIso): string {
  return `${fechaCorta(lunes)} – ${fechaCorta(sumarDias(lunes, 6))} ${lunes.slice(0, 4)}`
}
