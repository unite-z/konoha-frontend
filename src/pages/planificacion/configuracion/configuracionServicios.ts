/**
 * Lógica pura de Configuración (AV-268): estación del día, textos de la tabla de servicios y validación del panel
 * «Editar servicio», que une las cuatro frecuencias y la duración. Se prueba en `configuracionServicios.test.ts`.
 */
import type { TonoEstado } from '@/components/ui/Estado'
import type { FechaIso } from '@/types/comun'
import { ESTACIONES, type DuracionEntrada, type DuracionServicio, type Estacion, type FrecuenciaEntrada, type FrecuenciaEstacion, type ServicioPeriodico } from '@/types/planificacion'
import { horaCorta } from '@/utils/planificacion'
import {
  validarDuracion,
  validarFrecuencia,
  type BorradorDuracion,
  type BorradorFrecuencia,
  type ErroresDuracion,
  type ErroresFrecuencia,
} from '@/utils/validacionPlanificacion'

/** Estación del hemisferio sur a la que pertenece el día, con los cortes del backend (`Programador.estacion`). */
export function estacionDe(fecha: FechaIso): Estacion {
  const mesDia = fecha.slice(5)
  if (mesDia < '03-21' || mesDia >= '12-21') return 'Verano'
  if (mesDia < '06-21') return 'Otoño'
  return mesDia < '09-23' ? 'Invierno' : 'Primavera'
}

export const SIN_CONFIGURAR = 'Sin configurar'

/** «Cada 30 días · máx. 45»: la habitual es la práctica o, si no hay, la teórica. */
export function textoFrecuencia(frecuencia: FrecuenciaEstacion | undefined): string {
  if (!frecuencia) return SIN_CONFIGURAR
  const habitual = frecuencia.frecuencia_practica_dias ?? frecuencia.frecuencia_teorica_dias
  const maxima = frecuencia.frecuencia_maxima_dias
  return maxima ? `Cada ${habitual} días · máx. ${maxima}` : `Cada ${habitual} días`
}

/** «3 días + 1 de limpieza» o «10 días». */
export function textoDuracionServicio(duracion: DuracionServicio | null): string {
  if (!duracion) return SIN_CONFIGURAR
  const dias = `${duracion.duracion_maxima_dias} ${duracion.duracion_maxima_dias === 1 ? 'día' : 'días'}`
  return duracion.dias_limpieza ? `${dias} + ${duracion.dias_limpieza} de limpieza` : dias
}

/** Configurado: las cuatro estaciones y la duración; si falta algo, incompleto. */
export function estadoServicio(servicio: ServicioPeriodico): { texto: string; tono: TonoEstado } {
  const completo = servicio.duracion !== null && ESTACIONES.every((e) => servicio.frecuencias.some((f) => f.estacion === e))
  return completo ? { texto: 'Configurado', tono: 'exito' } : { texto: 'Incompleto', tono: 'aviso' }
}

/** Autor y fecha del último cambio de frecuencia o duración. */
export function ultimaModificacion(servicio: ServicioPeriodico): { fecha: string; autor: string } | null {
  const cambios = [...servicio.frecuencias, ...(servicio.duracion ? [servicio.duracion] : [])]
  const ultimo = cambios.sort((a, b) => b.fecha_modificacion.localeCompare(a.fecha_modificacion))[0]
  return ultimo ? { fecha: ultimo.fecha_modificacion, autor: ultimo.modificado_por } : null
}

export interface BorradorServicio {
  frecuencias: Record<Estacion, BorradorFrecuencia>
  duracion: BorradorDuracion
}

export function borradorInicial(servicio: ServicioPeriodico): BorradorServicio {
  const frecuencias = {} as Record<Estacion, BorradorFrecuencia>
  for (const estacion of ESTACIONES) {
    const f = servicio.frecuencias.find((x) => x.estacion === estacion)
    frecuencias[estacion] = {
      teorica: f?.frecuencia_teorica_dias.toString() ?? '',
      practica: f?.frecuencia_practica_dias?.toString() ?? '',
      maxima: f?.frecuencia_maxima_dias?.toString() ?? '',
    }
  }
  const d = servicio.duracion
  return {
    frecuencias,
    duracion: {
      duracion: d?.duracion_maxima_dias.toString() ?? '',
      limpieza: d?.dias_limpieza?.toString() ?? '',
      inicio: horaCorta(d?.hora_inicio) ?? '',
      fin: horaCorta(d?.hora_fin) ?? '',
    },
  }
}

export interface ValidacionServicio {
  erroresFrecuencia: Partial<Record<Estacion, ErroresFrecuencia>>
  erroresDuracion: ErroresDuracion
  /** Solo las estaciones que cambian. */
  frecuencias: { estacion: Estacion; entrada: FrecuenciaEntrada }[]
  /** `null` si la duración no cambia. */
  duracion: DuracionEntrada | null
  valido: boolean
}

const NOMBRES: Record<keyof BorradorFrecuencia, string> = { teorica: 'teórica', practica: 'práctica', maxima: 'máxima' }

/** Mensajes de la tabla de frecuencias, como en Figma: «Verano: la máxima no puede ser menor que la práctica». */
function erroresDeEstacion(estacion: Estacion, errores: ErroresFrecuencia, borrador: BorradorFrecuencia): ErroresFrecuencia {
  const mensajes: ErroresFrecuencia = {}
  for (const clave of Object.keys(errores) as (keyof BorradorFrecuencia)[]) {
    mensajes[clave] = errores[clave]?.includes('habitual')
      ? `${estacion}: la máxima no puede ser menor que la ${borrador.practica.trim() ? 'práctica' : 'teórica'}`
      : `${estacion}: la ${NOMBRES[clave]} debe ser un número entero de días mayor que 0`
  }
  return mensajes
}

const vacio = (b: BorradorFrecuencia | BorradorDuracion) => Object.values(b).every((v) => !v.trim())
const igual = <T extends object>(a: T, b: T) => JSON.stringify(a) === JSON.stringify(b)

/**
 * Valida solo lo que cambia. Una estación o una duración sin configurar puede quedarse vacía (el servicio sigue
 * incompleto); una ya configurada no se puede vaciar.
 */
export function validarServicio(borrador: BorradorServicio, inicial: BorradorServicio): ValidacionServicio {
  const resultado: ValidacionServicio = { erroresFrecuencia: {}, erroresDuracion: {}, frecuencias: [], duracion: null, valido: true }
  for (const estacion of ESTACIONES) {
    const actual = borrador.frecuencias[estacion]
    const antes = inicial.frecuencias[estacion]
    if (igual(actual, antes) || (vacio(actual) && vacio(antes))) continue
    const { errores, entrada } = validarFrecuencia(actual)
    if (entrada) resultado.frecuencias.push({ estacion, entrada })
    else resultado.erroresFrecuencia[estacion] = erroresDeEstacion(estacion, errores, actual)
  }
  if (!igual(borrador.duracion, inicial.duracion) && !(vacio(borrador.duracion) && vacio(inicial.duracion))) {
    const { errores, entrada } = validarDuracion(borrador.duracion)
    resultado.duracion = entrada
    resultado.erroresDuracion = errores
  }
  resultado.valido = Object.keys(resultado.erroresFrecuencia).length === 0 && Object.keys(resultado.erroresDuracion).length === 0
  return resultado
}
