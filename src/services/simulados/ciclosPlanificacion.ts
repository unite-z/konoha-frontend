/**
 * Código de los ciclos de MOD-03 con el contrato de AV-364 («CC-2026-11»), solo con `VITE_DATOS_SIMULADOS=true`:
 * el backend aún no lo genera. Iniciales de las dos primeras palabras del servicio, año y mes del inicio previsto.
 */
import type { Programacion } from '@/types/planificacion'

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

export function simularCodigosCiclos(ciclos: Programacion[]): Programacion[] {
  return ciclos.map((ciclo) =>
    ciclo.codigo
      ? ciclo
      : { ...ciclo, codigo: `${prefijoServicio(ciclo.servicio)}-${ciclo.fecha_inicio_prevista.slice(0, 4)}-${ciclo.fecha_inicio_prevista.slice(5, 7)}` },
  )
}
