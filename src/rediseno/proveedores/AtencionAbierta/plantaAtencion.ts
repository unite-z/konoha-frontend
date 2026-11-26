/**
 * Planta de una atención para «Nuevo análisis» (RD-55). El backend analiza la atención con el primer ejemplar de su
 * alcance; sin ejemplar en el alcance, el diálogo no tiene planta que analizar.
 */
import type { Atencion } from '@/types/tercerizados'
import type { AtencionBuscable } from '@/types/evidenciaFitosanitariaIa'
import { codigoCorto } from '@/utils/estadosTercerizados'

export function plantaDeAtencion(atencion: Atencion): AtencionBuscable | null {
  const alcance = atencion.alcances.find((a) => a.ejemplar_id !== null && a.ejemplar_codigo)
  if (!alcance || alcance.ejemplar_id === null || !alcance.ejemplar_codigo) return null
  return {
    id: atencion.id,
    plaga: atencion.plagas.map((p) => p.plaga_nombre).join(', ') || codigoCorto(atencion.codigo),
    ejemplar: {
      id: alcance.ejemplar_id,
      codigo: alcance.ejemplar_codigo,
      // La atención no trae la especie: el backend la lee del ejemplar al analizar.
      especie: null,
      espacio: alcance.ejemplar_area_verde_nombre ?? alcance.area_verde_nombre,
    },
  }
}
