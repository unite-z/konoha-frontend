import type { PoligonoMapaAsignado } from '@/types/mapaInventario'
import type { AreaVerde } from '@/types/areasVerdes'

/** Paleta de tokens para los tipos de uso (categórica, solo tokens semánticos). */
const TOKENS_USO = [
  '--color-success',
  '--color-info',
  '--color-warning',
  '--color-chart',
  '--color-action-primary',
  '--color-neutral',
] as const

const claseDeUso = (usoId: number | null | undefined) => `uso-${usoId ?? 0}`

export interface IndicePoligonos {
  porMapaId: Map<string, PoligonoMapaAsignado>
  /** Contorno (`mapa_id`) de cada área de inventario. */
  mapaIdDeArea: Map<number, string>
}

export function indicarPoligonos(poligonos: readonly PoligonoMapaAsignado[]): IndicePoligonos {
  const porMapaId = new Map<string, PoligonoMapaAsignado>()
  const mapaIdDeArea = new Map<number, string>()
  for (const poligono of poligonos) {
    porMapaId.set(poligono.id_fuente, poligono)
    if (poligono.area_verde_id !== null && !mapaIdDeArea.has(poligono.area_verde_id)) {
      mapaIdDeArea.set(poligono.area_verde_id, poligono.id_fuente)
    }
  }
  return { porMapaId, mapaIdDeArea }
}

export interface UsoLeyenda {
  clase: string
  nombre: string
  /** Posición en `TOKENS_USO`: el color de la muestra en la leyenda. */
  tono: number
  cantidad: number
}

/**
 * `mapa_id → clase` y `clase → token` de las áreas del resultado, según su tipo de uso, y la leyenda de esos colores.
 * El color sale del orden del uso en el catálogo (`ordenUsos`, ids), así los primeros usos no comparten tono; sin
 * catálogo, del propio id.
 */
export function coloresPorUso(areas: readonly AreaVerde[], indice: IndicePoligonos, ordenUsos: readonly number[] = []) {
  const clases: Record<string, string> = {}
  const colores: Record<string, string> = {}
  const leyenda = new Map<string, UsoLeyenda>()
  for (const area of areas) {
    const mapaId = indice.mapaIdDeArea.get(area.id)
    if (!mapaId) continue
    const clase = claseDeUso(area.tipo_uso_id)
    const posicion = area.tipo_uso_id == null ? -1 : ordenUsos.indexOf(area.tipo_uso_id)
    const tono = (posicion >= 0 ? posicion : (area.tipo_uso_id ?? 0)) % TOKENS_USO.length
    clases[mapaId] = clase
    colores[clase] = TOKENS_USO[tono]
    const entrada = leyenda.get(clase) ?? {
      clase,
      nombre: area.tipo_uso_nombre ?? 'Sin tipo de uso',
      tono,
      cantidad: 0,
    }
    entrada.cantidad++
    leyenda.set(clase, entrada)
  }
  return {
    clases,
    colores,
    leyenda: [...leyenda.values()].sort((a, b) => b.cantidad - a.cantidad),
  }
}

/** Página `n` (desde 1) de la lista, acotada al rango válido. */
export function paginaDe<T>(
  elementos: readonly T[],
  pagina: number,
  porPagina: number,
): { pagina: number; filas: T[] } {
  const total = Math.max(1, Math.ceil(elementos.length / porPagina))
  const actual = Math.min(Math.max(1, pagina), total)
  return {
    pagina: actual,
    filas: elementos.slice((actual - 1) * porPagina, actual * porPagina),
  }
}
