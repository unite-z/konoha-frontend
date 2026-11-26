/**
 * Accesos de la ficha del ejemplar a otros módulos. Solo enlazan: la base de cada ruta sale de su `enlaces.ts` y aquí se
 * le añade la consulta del contrato de «Puntos de entrada entre módulos». Nada de lo que enseñan se pinta en el Mapa.
 */
import { rutaIncidencias } from '@/rediseno/incidencias/enlaces'
import { rutaProveedores } from '@/rediseno/proveedores/enlaces'

const SEGMENTO_FITOSANITARIO = 'fitosanitario'
const SEGMENTO_PLAGAS = 'plagas-productos'

function conConsulta(base: string, parametros: Record<string, string>): string {
  return `${base}?${new URLSearchParams(parametros).toString()}`
}

export interface EnlacesEjemplar {
  /** Marcar el ejemplar con atención especial (RD-57). */
  atencionEspecial: string
  /** Registrar una observación de plaga sobre el ejemplar (RD-58). */
  plaga: string
  /** Analizar las fotos del ejemplar (RD-55). */
  analizarFotos: string
  /** Reportar una incidencia con el área y el ejemplar ya elegidos (RD-45). */
  incidencia: string
}

export function enlacesDeEjemplar(ejemplarId: number, areaId: number | null): EnlacesEjemplar {
  const id = String(ejemplarId)
  const fitosanitario = `${rutaProveedores()}/${SEGMENTO_FITOSANITARIO}`
  return {
    atencionEspecial: conConsulta(fitosanitario, { marcar: id }),
    plaga: conConsulta(`${rutaProveedores()}/${SEGMENTO_PLAGAS}`, {
      observacion: 'nueva',
      ejemplar: id,
    }),
    analizarFotos: conConsulta(fitosanitario, { ejemplar_id: id }),
    incidencia: conConsulta(
      rutaIncidencias(),
      areaId === null ? { ejemplar: id } : { reportar: String(areaId), ejemplar: id },
    ),
  }
}
