/**
 * Vista previa de la capacidad de una campaña de poda mientras se planifica. El servidor recalcula lo mismo
 * al guardar (`ReglasCampanaPoda`). Las fechas son días del calendario, sin hora ni zona.
 */
import type { CapacidadCampana, EstadoCampana } from '@/types/campanasPoda'

const MS_DIA = 86_400_000

/** Días del periodo, contando inicio y fin. `null` si faltan fechas o el fin es anterior al inicio. */
export function diasDelPeriodo(inicio: string, fin: string): number | null {
  const desde = Date.parse(`${inicio}T00:00:00Z`)
  const hasta = Date.parse(`${fin}T00:00:00Z`)
  if (Number.isNaN(desde) || Number.isNaN(hasta) || hasta < desde) return null
  return (hasta - desde) / MS_DIA + 1
}

/** Capacidad con los datos del formulario, o `null` si aún no se puede calcular. */
export function calcularCapacidad(inicio: string, fin: string, objetivoDiario: number, total: number): CapacidadCampana | null {
  const dias = diasDelPeriodo(inicio, fin)
  if (dias === null || !Number.isInteger(objetivoDiario) || objetivoDiario <= 0) return null
  const estimada = dias * objetivoDiario
  return { dias, estimada, requerido_por_dia: (total / dias).toFixed(2), excedida: total > estimada }
}

/** Último día posible del periodo: el máximo de días desde el inicio, sin pasar del fin del cierre. */
export function finSugerido(inicio: string, finCierre: string, duracionMaxima: number): string {
  const limite = new Date(Date.parse(`${inicio}T00:00:00Z`) + (duracionMaxima - 1) * MS_DIA).toISOString().slice(0, 10)
  return limite < finCierre ? limite : finCierre
}

export const TEXTO_ESTADO_CAMPANA: Record<EstadoCampana, string> = {
  Borrador: 'Borrador',
  Planificada: 'Planificada',
  EnEjecucion: 'En ejecución',
  Finalizada: 'Finalizada',
}
