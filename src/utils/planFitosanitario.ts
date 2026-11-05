/**
 * Borrador y validaciones del plan fitosanitario estacional (RF-FIT-001, RN-010). Funciones puras: el
 * servidor vuelve a validar todo. Los espacios se eligen una sola vez y se repiten en las aplicaciones que
 * se programen; los alcances reutilizan `AlcanceSeleccionado` de «Nueva atención».
 */
import type { AplicacionEstacionalEntrada, ContratoMaestro, Estacion, PlanFitosanitarioEntrada } from '@/types/maestrosTercerizados'
import type { AlcanceEntrada } from '@/types/tercerizados'
import { normalizarMetrado, type AlcanceSeleccionado, type ErroresPaso2 } from './nuevaAtencion'

export const ESTACIONES: Estacion[] = ['Verano', 'Otoño', 'Invierno', 'Primavera']

export interface BorradorPlanFitosanitario {
  contrato: ContratoMaestro | null
  /** Fecha `AAAA-MM-DD` por estación; vacía si esa estación no se programa. */
  fechas: Record<Estacion, string>
  alcances: AlcanceSeleccionado[]
  /** Hace falta si no cubre las cuatro estaciones (RN-010). */
  motivo: string
}

export const BORRADOR_PLAN_VACIO: BorradorPlanFitosanitario = {
  contrato: null,
  fechas: { Verano: '', Otoño: '', Invierno: '', Primavera: '' },
  alcances: [],
  motivo: '',
}

export interface ErroresPlanFitosanitario {
  contrato?: string
  motivo?: string
}

/** Estaciones con fecha indicada. */
export function estacionesProgramadas(b: BorradorPlanFitosanitario): Estacion[] {
  return ESTACIONES.filter((e) => b.fechas[e].trim())
}

export function validarPlan(b: BorradorPlanFitosanitario, hoy: string): ErroresPlanFitosanitario {
  const errores: ErroresPlanFitosanitario = {}
  if (!b.contrato) errores.contrato = 'Selecciona el contrato vigente de control fitosanitario'
  else if (b.contrato.vigencia_inicio > hoy || b.contrato.vigencia_fin < hoy) {
    errores.contrato = 'El contrato no está vigente hoy. Selecciona uno vigente'
  }
  const programadas = estacionesProgramadas(b)
  if (programadas.length === 0) errores.motivo = 'Indica la fecha de al menos una estación'
  else if (programadas.length < ESTACIONES.length && !b.motivo.trim()) {
    errores.motivo = 'Indica el motivo: el plan no cubre las cuatro estaciones (RN-010)'
  }
  return errores
}

function alcanceEntrada(a: AlcanceSeleccionado): AlcanceEntrada {
  const destino = a.tipo === 'area' ? { area_verde_id: a.id } : { ejemplar_id: a.id }
  const metrado = a.metrado.trim() ? normalizarMetrado(a.metrado) : null
  return metrado !== null && a.unidad_medida_id
    ? { ...destino, metrado, unidad_medida_id: Number(a.unidad_medida_id) }
    : destino
}

/** Construye la entrada. Solo se llama con un borrador sin errores (de plan y de alcances). */
export function construirPlan(b: BorradorPlanFitosanitario): PlanFitosanitarioEntrada {
  // oxlint-disable-next-line typescript/no-non-null-assertion -- construirPlan solo se llama con un borrador validado
  const contratoId = b.contrato!.id
  const alcances = b.alcances.map(alcanceEntrada)
  const aplicaciones: AplicacionEstacionalEntrada[] = estacionesProgramadas(b).map((estacion) => ({
    estacion,
    fecha_inicio: b.fechas[estacion],
    fecha_fin: b.fechas[estacion],
    alcances,
  }))
  const entrada: PlanFitosanitarioEntrada = { contrato_id: contratoId, aplicaciones }
  if (b.motivo.trim()) entrada.motivo = b.motivo.trim()
  return entrada
}

export type { AlcanceSeleccionado, ErroresPaso2 }
