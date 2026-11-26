import type { DatosCampus } from '@/types/campus3d'
import type { GrupoColor } from './escena'

/**
 * Agrupa las áreas por clase: `clases` es `mapa_id → clase` y `colores` es `clase → token CSS` (`--color-success`).
 * Un id de varios polígonos aporta todas sus partes; los ids que no están en el campus y las clases sin color se ignoran.
 */
export function agruparPorClase(
  datos: DatosCampus,
  clases: Readonly<Record<string, string>>,
  colores: Readonly<Record<string, string>>,
): GrupoColor[] {
  const porToken = new Map<string, number[]>()
  datos.areas.forEach((area, indice) => {
    const token = colores[clases[area.id]]
    if (!token) return
    porToken.set(token, [...(porToken.get(token) ?? []), indice])
  })
  return [...porToken].map(([token, indices]) => ({ token, indices }))
}
