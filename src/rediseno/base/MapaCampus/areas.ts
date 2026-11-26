import type { AreaCampus, DatosCampus } from '@/types/campus3d'

/** Clave de `sessionStorage`: la construcción animada del mapa se ve una vez por sesión. */
export const CLAVE_CONSTRUCCION = 'konoha.mapa.construido'

/** Posición del área en `datos.areas`, a partir de su id (cadena) o de su posición (número). */
export function indiceDeArea(datos: DatosCampus, area: number | string | undefined): number | null {
  if (area === undefined) return null
  if (typeof area === 'number') return area >= 0 && area < datos.areas.length ? area : null
  const indice = datos.areas.findIndex((a) => a.id === area)
  return indice >= 0 ? indice : null
}

export function nombreDeArea(area: AreaCampus): string {
  return area.n || (area.c ? `Área ${area.c}` : 'Área sin nombre')
}
