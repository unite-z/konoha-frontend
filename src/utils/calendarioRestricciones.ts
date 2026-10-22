/** Lógica pura del calendario de restricciones de MOD-03. */
import type { FechaIso } from '../types/comun'
import type { EfectoRestriccion, Restriccion } from '../types/planificacion'
import type { Tono } from '../components/ui/tonos'
import type { NombreIcono } from '../components/ui/Icono'

export interface Mes {
  anio: number
  /** 1 a 12 */
  mes: number
}

const NOMBRES_MES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** Mes de una fecha `AAAA-MM-DD`. */
export function mesDeFecha(fecha: FechaIso): Mes {
  return { anio: Number(fecha.slice(0, 4)), mes: Number(fecha.slice(5, 7)) }
}

/** Mes desplazado `delta` meses (puede cruzar de año). */
export function desplazarMes({ anio, mes }: Mes, delta: number): Mes {
  const indice = anio * 12 + (mes - 1) + delta
  return { anio: Math.floor(indice / 12), mes: (indice % 12) + 1 }
}

/** Primer y último día del mes. */
export function rangoDelMes({ anio, mes }: Mes): { desde: FechaIso; hasta: FechaIso } {
  const ultimo = new Date(anio, mes, 0).getDate()
  const base = `${anio}-${String(mes).padStart(2, '0')}`
  return { desde: `${base}-01`, hasta: `${base}-${String(ultimo).padStart(2, '0')}` }
}

/** «octubre de 2026» */
export function nombreMes({ anio, mes }: Mes): string {
  return `${NOMBRES_MES[mes - 1]} de ${anio}`
}

/** Presentación de cada efecto: nunca solo color, siempre texto e icono. */
export const PRESENTACION_EFECTO: Record<EfectoRestriccion, { texto: string; tono: Tono; icono: NombreIcono }> = {
  Prohibicion: { texto: 'Prohibición', tono: 'error', icono: 'aspa' },
  Advertencia: { texto: 'Advertencia', tono: 'advertencia', icono: 'triangulo' },
  Favorable: { texto: 'Favorable', tono: 'exito', icono: 'verificacion' },
}

/** Restricciones ordenadas por fecha de inicio y, a igualdad, por fin. */
export function ordenarRestricciones(restricciones: Restriccion[]): Restriccion[] {
  return [...restricciones].sort(
    (a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio) || a.fecha_fin.localeCompare(b.fecha_fin) || a.id - b.id,
  )
}
