/**
 * Lógica pura del detalle del corte (AV-270, Figma 346-1334, 371-4306 y 370-3811): avance de la ruta, última
 * marca (destacada si pasan más de 24 h), cortados por día, por cortar, duración «Día N de 4» e interrupciones.
 * Se prueba en `corte.test.ts`.
 */
import type { FechaIso } from '@/types/comun'
import type { CicloCorte, JardinRuta } from '@/types/corte'
import type { Programacion, ServicioPeriodico } from '@/types/planificacion'
import { instanteALocalLima } from '@/utils/instanteLima'
import { diasDelPeriodo } from '../calendario/programarCiclo'
import { diaFigma, fechaNumerica, sumarDias } from '../resumen/resumenPlanificacion'

/** El corte de césped es el único servicio con ruta de jardines (RF-COR-001). */
/** «1 jardín» o «3 jardines». */
export function jardines(n: number): string {
  return n === 1 ? '1 jardín' : `${n} jardines`
}

export function esCorte(servicio: string): boolean {
  return servicio.toLowerCase().startsWith('corte')
}

export function avanceRuta(jardines: JardinRuta[]): { cortados: number; total: number; porcentaje: number } {
  const cortados = jardines.filter((j) => j.estado === 'Cortado').length
  return { cortados, total: jardines.length, porcentaje: jardines.length === 0 ? 0 : Math.round((cortados / jardines.length) * 100) }
}

/** «Hoy 10:42», «Ayer 08:15» o «16/11 10:42» de un instante, visto desde `ahora` (`AAAA-MM-DDTHH:mm` de Lima). */
export function momento(instante: string, ahora: string): string {
  const local = instanteALocalLima(instante) ?? instante
  const dia = local.slice(0, 10)
  const hora = local.slice(11, 16)
  const hoy = ahora.slice(0, 10)
  if (dia === hoy) return `Hoy ${hora}`
  if (dia === sumarDias(hoy, -1)) return `Ayer ${hora}`
  return `${fechaNumerica(dia)} ${hora}`
}

function minutosEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(`${hasta}:00Z`) - Date.parse(`${desde}:00Z`)) / 60_000)
}

/**
 * Nota del avance: «Última marca hoy 10:42» o, si pasan más de 24 h, «Actualizado ayer 08:15 · hace 26 h» en
 * aviso (RF-COR-003: el jefe ve que el avance no se actualiza).
 */
export function ultimaMarca(jardines: JardinRuta[], ahora: string): { texto: string; desfasada: boolean } {
  const marcas = jardines.map((j) => j.marcado_en).filter((m): m is string => Boolean(m))
  if (marcas.length === 0) return { texto: 'Sin marcas todavía', desfasada: false }
  const ultima = marcas.sort((a, b) => Date.parse(b) - Date.parse(a))[0]
  const local = instanteALocalLima(ultima) ?? ultima
  const horas = Math.floor(minutosEntre(local.slice(0, 16), ahora) / 60)
  const cuando = momento(ultima, ahora)
  if (horas > 24) return { texto: `Actualizado ${cuando.charAt(0).toLowerCase()}${cuando.slice(1)} · hace ${horas} h`, desfasada: true }
  return { texto: `Última marca ${cuando.charAt(0).toLowerCase()}${cuando.slice(1)}`, desfasada: false }
}

/** Cortados de cada día del ciclo, desde el inicio hasta hoy o el fin («Lun 16 · 15»). */
export function cortadosPorDia(jardines: JardinRuta[], inicio: FechaIso, hasta: FechaIso): { fecha: FechaIso; texto: string; cortados: number }[] {
  const dias: { fecha: FechaIso; texto: string; cortados: number }[] = []
  for (let fecha = inicio; fecha <= hasta && dias.length < 14; fecha = sumarDias(fecha, 1)) {
    const cortados = jardines.filter((j) => j.marcado_en && (instanteALocalLima(j.marcado_en) ?? j.marcado_en).slice(0, 10) === fecha).length
    dias.push({ fecha, texto: diaFigma(fecha), cortados })
  }
  return dias
}

/** Jardines por cortar: primero uno de cada zona, en el orden de la ruta, y luego el resto (Figma 371-4306). */
export function porCortar(jardines: JardinRuta[]): JardinRuta[] {
  const pendientes = jardines.filter((j) => j.estado === 'Pendiente')
  const zonas = new Set<string>()
  const primeros = pendientes.filter((j) => (zonas.has(j.zona) ? false : (zonas.add(j.zona), true)))
  return [...primeros, ...pendientes.filter((j) => !primeros.includes(j))]
}

/** Último día que se enseña en «Cortados por día»: hoy o, si es antes, el último día de corte previsto. */
export function ultimoDiaCorte(inicio: FechaIso, hoy: FechaIso, servicio: ServicioPeriodico | undefined, finReal: FechaIso | null): FechaIso {
  if (finReal) return finReal
  const ultimoPrevisto = sumarDias(inicio, (servicio?.duracion?.duracion_maxima_dias ?? 1) - 1)
  return ultimoPrevisto > hoy ? ultimoPrevisto : hoy
}

/** «Hoy 10:42 · J. Ramos», «Detenido por interrupción» o `null` (sin marca). */
export function textoMarcado(jardin: JardinRuta, ahora: string): string | null {
  if (jardin.marcado_en) return `${momento(jardin.marcado_en, ahora)}${jardin.marcado_por ? ` · ${jardin.marcado_por}` : ''}`
  return jardin.detenido_por_interrupcion ? 'Detenido por interrupción' : null
}

/** «0,5 días», «1 día» o «2 días». */
function diasDecimales(dias: number): string {
  return `${String(dias).replace('.', ',')} ${dias === 1 ? 'día' : 'días'}`
}

export interface IndicadorCorte {
  etiqueta: string
  valor: string
  contexto?: string
  nota?: string
  /** Nota en tono de aviso (avance sin actualizar en más de 24 h). */
  notaAviso?: boolean
  /** Nota en tono de error (duración por encima del máximo, Figma 371-5092). */
  notaError?: boolean
}

/** «Avance de la ruta», «Duración» («Día 2 de 4») e «Interrupciones» del corte en curso o completado. */
export function indicadoresCorte(ciclo: Programacion, servicio: ServicioPeriodico | undefined, corte: CicloCorte, hoy: FechaIso, ahora: string): IndicadorCorte[] {
  const avance = avanceRuta(corte.jardines)
  const marca = ultimaMarca(corte.jardines, ahora)
  const duracion = servicio?.duracion
  const total = duracion ? duracion.duracion_maxima_dias + (duracion.dias_limpieza ?? 0) : diasDelPeriodo(ciclo.fecha_inicio_prevista, ciclo.fecha_fin_prevista)
  const inicio = ciclo.fecha_inicio_real ?? ciclo.fecha_inicio_prevista
  const fin = ciclo.fecha_fin_real ?? hoy
  const dia = fin < inicio ? 0 : diasDelPeriodo(inicio, fin)
  const minutos = corte.interrupciones.reduce((suma, i) => suma + i.minutos_descontados, 0)
  const ultima = corte.interrupciones.at(-1)
  const completa = avance.total > 0 && avance.cortados === avance.total
  const exceso = dia - total
  return [
    {
      etiqueta: 'Avance de la ruta',
      valor: `${avance.porcentaje} %`,
      contexto: `${avance.cortados} de ${jardines(avance.total)}`,
      nota: completa ? 'Ruta completa' : marca.texto,
      notaAviso: !completa && marca.desfasada,
    },
    {
      etiqueta: 'Duración',
      valor: `Día ${dia} de ${total}`,
      contexto: duracion?.dias_limpieza ? `${duracion.duracion_maxima_dias} de corte + ${duracion.dias_limpieza} de limpieza` : undefined,
      nota:
        exceso > 0
          ? `Supera el máximo en ${exceso} ${exceso === 1 ? 'día' : 'días'}`
          : corte.dias_interrupcion_descontados > 0
            ? `${diasDecimales(corte.dias_interrupcion_descontados)} de interrupción descontados`
            : 'Sin interrupciones',
      notaError: exceso > 0,
    },
    {
      etiqueta: 'Interrupciones',
      valor: String(corte.interrupciones.length),
      contexto: ultima ? `${ultima.zona_afectada} → ${ultima.zona_alternativa ?? 'sin zona libre'}` : 'Ninguna',
      nota: minutos > 0 ? `${minutos} min descontados` : undefined,
    },
  ]
}

/** Indicador del avance de un corte que aún no empezó (Figma 370-3811): «0 %», «0 de 45 jardines». */
export function indicadorAvanceProgramado(corte: CicloCorte): IndicadorCorte {
  const avance = avanceRuta(corte.jardines)
  return { etiqueta: 'Avance de la ruta', valor: `${avance.porcentaje} %`, contexto: `${avance.cortados} de ${jardines(avance.total)}`, nota: 'Sin marcas todavía' }
}

/** La ruta está completa: ya se puede registrar la limpieza y cerrar el ciclo (RF-COR-006). */
export function rutaCompleta(corte: CicloCorte): boolean {
  return corte.jardines.length > 0 && corte.jardines.every((j) => j.estado === 'Cortado')
}

/**
 * «Total: 3 días de corte + 1 de limpieza = 4» frente al máximo (RN-002: 3 + 1), con «Cumple» o «No cumple»
 * (Figma 371-4838 y 371-5092). Los días de corte son los días con alguna marca.
 */
export function totalLimpieza(corte: CicloCorte, servicio: ServicioPeriodico | undefined): { texto: string; cumple: boolean } {
  const diasCorte = new Set(corte.jardines.map((j) => (j.marcado_en ? (instanteALocalLima(j.marcado_en) ?? j.marcado_en).slice(0, 10) : null)).filter(Boolean)).size
  const limpieza = corte.limpiezas.length
  const total = diasCorte + limpieza
  const maximo = servicio?.duracion ? servicio.duracion.duracion_maxima_dias + (servicio.duracion.dias_limpieza ?? 0) : 4
  return { texto: `Total: ${diasCorte} ${diasCorte === 1 ? 'día' : 'días'} de corte + ${limpieza} de limpieza = ${total}`, cumple: total <= maximo }
}

/** «19/11/2026». */
export function fechaCompleta(fecha: FechaIso): string {
  return `${fecha.slice(8, 10)}/${fecha.slice(5, 7)}/${fecha.slice(0, 4)}`
}
