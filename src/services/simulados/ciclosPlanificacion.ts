/**
 * Datos de los ciclos de MOD-03 que el backend aún no da, solo con `VITE_DATOS_SIMULADOS=true` (D9):
 * - código (AV-364, «CC-2026-11»): iniciales de las dos primeras palabras del servicio, año y mes del inicio previsto;
 * - historial (AV-253): programado dos semanas antes del inicio, iniciado y finalizado en sus fechas reales.
 */
import type { EventoCiclo, Programacion } from '@/types/planificacion'

const AUTOR_SIMULADO = 'Usuario de prueba'

function sumarDias(fecha: string, dias: number): string {
  const dia = new Date(`${fecha}T00:00:00Z`)
  dia.setUTCDate(dia.getUTCDate() + dias)
  return dia.toISOString().slice(0, 10)
}

const PALABRAS_VACIAS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y'])

/** «Corte de césped» → «CC», «Poda mayor del cierre» → «PM», «Mantenimiento de jardines» → «MJ». */
export function prefijoServicio(servicio: string): string {
  const palabras = servicio
    .split(/[\s·.]+/)
    .filter((palabra) => /^\p{L}/u.test(palabra) && !PALABRAS_VACIAS.has(palabra.toLowerCase()))
  return palabras
    .slice(0, 2)
    .map((palabra) => palabra[0].toUpperCase())
    .join('')
}

/** Hora de Lima (UTC−5) de un día: `2026-11-30` y `06:10` → `2026-11-30T06:10:00-05:00`. */
function instante(fecha: string, hora: string): string {
  return `${fecha}T${hora}:00-05:00`
}

export function historialSimulado(ciclo: Programacion): EventoCiclo[] {
  const eventos: EventoCiclo[] = [{ estado: 'Programada', fecha_hora: instante(sumarDias(ciclo.fecha_inicio_prevista, -14), '09:30'), autor: AUTOR_SIMULADO }]
  if (ciclo.fecha_inicio_real) eventos.push({ estado: 'EnCurso', fecha_hora: instante(ciclo.fecha_inicio_real, '06:10'), autor: AUTOR_SIMULADO })
  if (ciclo.fecha_fin_real) eventos.push({ estado: 'Completada', fecha_hora: instante(ciclo.fecha_fin_real, '18:00'), autor: AUTOR_SIMULADO })
  return eventos
}

export function simularCiclos(ciclos: Programacion[]): Programacion[] {
  return ciclos.map((ciclo) => ({
    ...ciclo,
    codigo: ciclo.codigo ?? `${prefijoServicio(ciclo.servicio)}-${ciclo.fecha_inicio_prevista.slice(0, 4)}-${ciclo.fecha_inicio_prevista.slice(5, 7)}`,
    historial: ciclo.historial ?? historialSimulado(ciclo),
  }))
}
