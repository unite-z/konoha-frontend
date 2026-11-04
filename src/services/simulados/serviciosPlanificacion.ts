/**
 * Datos de los servicios periódicos de MOD-03 con el contrato de AV-363, solo con `VITE_DATOS_SIMULADOS=true`:
 * la vía y el proveedor habitual (todos tercerizados, con el proveedor de demostración según el servicio) y los
 * valores iniciales de la sección para «Usar valores iniciales».
 */
import { ESTACIONES, type ServicioPeriodico, type ValoresIniciales } from '@/types/planificacion'
import { responderSimulado } from './simulacion'

function proveedorDe(nombre: string): string {
  const servicio = nombre.toLowerCase()
  if (servicio.startsWith('corte')) return 'Servicios Verdes Demo S.A.C.'
  if (servicio.includes('fitosanitario')) return 'Fumigaciones Demo S.A.'
  return 'Podas Altura Demo E.I.R.L.'
}

export function simularViaServicios(servicios: ServicioPeriodico[]): ServicioPeriodico[] {
  return servicios.map((s) => {
    const via = s.via ?? 'Tercerizado'
    return { ...s, via, proveedor: s.proveedor !== undefined ? s.proveedor : via === 'PersonalPropio' ? null : proveedorDe(s.nombre) }
  })
}

/** Corte: 21, 35 y 45 días, 3 + 1; fitosanitario: 90, 90 y 100, 1 día de 06:00 a 18:00; el resto, anual y 10 días. */
export function valoresInicialesDe(servicio: ServicioPeriodico): ValoresIniciales {
  const nombre = servicio.nombre.toLowerCase()
  const [teorica, practica, maxima] = nombre.startsWith('corte') ? [21, 35, 45] : nombre.includes('fitosanitario') ? [90, 90, 100] : [365, 365, 365]
  const duracion = nombre.startsWith('corte')
    ? { duracion_maxima_dias: 3, dias_limpieza: 1, hora_inicio: null, hora_fin: null }
    : nombre.includes('fitosanitario')
      ? { duracion_maxima_dias: 1, dias_limpieza: 0, hora_inicio: '06:00', hora_fin: '18:00' }
      : { duracion_maxima_dias: 10, dias_limpieza: 0, hora_inicio: null, hora_fin: null }
  return {
    frecuencias: ESTACIONES.map((estacion) => ({ estacion, frecuencia_teorica_dias: teorica, frecuencia_practica_dias: practica, frecuencia_maxima_dias: maxima })),
    duracion,
  }
}

export function simularValoresIniciales(servicio: ServicioPeriodico, signal?: AbortSignal): Promise<ValoresIniciales> {
  return responderSimulado(() => valoresInicialesDe(servicio), { signal })
}
