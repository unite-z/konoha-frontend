import type { TipoExportable } from '@/types/exportaciones'

const MOTIVO_MATRIZ = 'Aún no está disponible: llega cuando exista su fuente de datos.'

/** «Matriz de incidencias» sigue deshabilitada aunque el servidor la anuncie como disponible. */
export function conMatrizDeshabilitada(tipos: TipoExportable[]): TipoExportable[] {
  return tipos.map((t) =>
    t.tipo === 'MatrizIncidencias'
      ? {
          ...t,
          disponible: false,
          motivo_no_disponible: t.motivo_no_disponible ?? MOTIVO_MATRIZ,
        }
      : t,
  )
}
