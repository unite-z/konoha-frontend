import type { AreaCampus, DatosCampus } from '@/types/campus3d'

/** Clave de `sessionStorage`: la construcción animada del mapa se ve una vez por sesión. */
export const CLAVE_CONSTRUCCION = 'konoha.mapa.construido'

/**
 * Un área de varios polígonos ocupa varias entradas de `datos.areas` con el mismo id. Cada entrada apunta a la primera
 * de su id (la principal, la única con `h` y `ct`), y cada principal a todas sus partes.
 */
export interface GruposAreas {
  principal: number[]
  partes: Map<number, number[]>
}

export function agruparAreas(datos: DatosCampus): GruposAreas {
  const primera = new Map<string, number>()
  const principal: number[] = []
  const partes = new Map<number, number[]>()
  datos.areas.forEach((area, indice) => {
    const p = primera.get(area.id) ?? indice
    primera.set(area.id, p)
    principal.push(p)
    partes.set(p, [...(partes.get(p) ?? []), indice])
  })
  return { principal, partes }
}

/** Posición del área principal en `datos.areas`, a partir de su id (cadena) o de su posición (número). */
export function indiceDeArea(datos: DatosCampus, area: number | string | undefined): number | null {
  if (area === undefined) return null
  if (typeof area === 'number') {
    if (!Number.isInteger(area) || area < 0 || area >= datos.areas.length) return null
    return indiceDeArea(datos, datos.areas[area].id)
  }
  const indice = datos.areas.findIndex((a) => a.id === area)
  return indice >= 0 ? indice : null
}

export function nombreDeArea(area: AreaCampus): string {
  if (area.n) return area.n
  if (area.c) return `Área ${area.c}`
  return `Área sin código de ${area.s} m²`
}
