/**
 * Último análisis de evidencia de una atención o de un ejemplar (RD-55). El backend lista los análisis del más
 * reciente al más antiguo y no filtra por planta, así que se recorren las primeras páginas hasta dar con el primero
 * que la nombra.
 */
import { listarAnalisisEvidencia } from '@/services/api/evidenciaFitosanitariaIa'
import type { SugerenciaEvidencia } from '@/types/evidenciaFitosanitariaIa'

export type ObjetivoEvidencia = { tipo: 'atencion'; id: number } | { tipo: 'ejemplar'; id: number }

/** Páginas que se recorren como máximo (25 análisis cada una): el último de una planta está entre los recientes. */
export const MAX_PAGINAS_BUSQUEDA = 4

export const esDelObjetivo = (s: SugerenciaEvidencia, objetivo: ObjetivoEvidencia): boolean =>
  objetivo.tipo === 'atencion' ? s.contenido.atencion?.id === objetivo.id : s.contenido.ejemplar?.id === objetivo.id

export async function ultimoAnalisis(
  objetivo: ObjetivoEvidencia,
  signal: AbortSignal,
): Promise<SugerenciaEvidencia | null> {
  for (let pagina = 1; pagina <= MAX_PAGINAS_BUSQUEDA; pagina++) {
    const respuesta = await listarAnalisisEvidencia({ page: pagina }, signal)
    const encontrado = respuesta.results.find((s) => esDelObjetivo(s, objetivo))
    if (encontrado) return encontrado
    if (!respuesta.next || respuesta.results.length === 0) break
  }
  return null
}
