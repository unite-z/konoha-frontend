/**
 * Enlaces de las acciones del área abierta. Cada una navega al módulo dueño con el contrato de «Puntos de entrada
 * entre módulos»: la base de la ruta sale de su `enlaces.ts` y solo se le añade la consulta. Cuando el dueño publique
 * una función propia para el punto de entrada (RD-35, RD-45, RD-58), basta cambiarla aquí.
 */
import { rutaIncidencias } from '@/rediseno/incidencias/enlaces'
import { rutaPlanificacionCuadrillas, rutaPlanificacionProgramar } from '@/rediseno/planificacion/enlaces'
import { rutaProveedores } from '@/rediseno/proveedores/enlaces'
import { rutaMapaEditarArea } from '../enlaces'

const SEGMENTO_PLAGAS = 'plagas-productos'

function conConsulta(base: string, parametros: Record<string, string>): string {
  return `${base}?${new URLSearchParams(parametros).toString()}`
}

export interface EnlacesArea {
  /** Encargo a una cuadrilla en Planificación (RD-35). */
  encargo: string
  /** Programar un ciclo (RD-31). */
  ciclo: string
  /** Reportar una incidencia con el área ya elegida (RD-45). */
  incidencia: string
  /** Observación de plaga con el área ya elegida (RD-58). */
  plaga: string
  /** Editar el área (RD-19). */
  editar: string
}

export function enlacesDeArea(areaId: number): EnlacesArea {
  const id = String(areaId)
  return {
    encargo: conConsulta(rutaPlanificacionCuadrillas(), { encargo: 'nuevo', area: id }),
    ciclo: rutaPlanificacionProgramar(),
    incidencia: conConsulta(rutaIncidencias(), { reportar: id }),
    plaga: conConsulta(`${rutaProveedores()}/${SEGMENTO_PLAGAS}`, { observacion: 'nueva', area: id }),
    editar: rutaMapaEditarArea(areaId),
  }
}
