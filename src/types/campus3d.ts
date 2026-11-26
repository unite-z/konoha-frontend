/**
 * Contrato de `public/datos/campus-3d.json` (AV-421). Es un fichero estático, no la API: las claves cortas son las del
 * generador (`scripts/campus-3d/`) y no siguen el snake_case de la API. Coordenadas en metros: x = este, y = norte,
 * con origen en `proyeccion`. Los polígonos y las polilíneas son listas planas [x0, y0, x1, y1, …].
 */

export interface ProyeccionCampus {
  tipo: string
  origen_lon: number
  origen_lat: number
  /** Metros por grado de longitud. */
  kx: number
  /** Metros por grado de latitud. */
  ky: number
  unidad: 'm'
}

export interface EdificioCampus {
  /** Contorno. */
  p: number[]
  /** Altura de la cubierta. */
  h: number
  /** Altura de la base. */
  b: number
}

export interface AreaCampus {
  id: string
  /** Nombre (puede venir vacío). */
  n: string
  /** Código del área. */
  c: string
  /** Superficie en m². */
  s: number
  /** Tipo de riego. */
  r: string
  p: number[]
  h: string
  /** Centro. */
  ct: [number, number]
}

/** [x, y, alto, fuste, radio] */
export type ArbolCampus = [number, number, number, number, number]

/** [nombre, x, y] */
export type EtiquetaCampus = [string, number, number]

export interface DatosCampus {
  atribucion: string
  proyeccion: ProyeccionCampus
  campus: number[]
  edificios: EdificioCampus[]
  cesped: number[][]
  canchas: number[][]
  agua: number[][]
  vias: number[][]
  senderos: number[][]
  areas: AreaCampus[]
  arboles: ArbolCampus[]
  etiquetas: EtiquetaCampus[]
}
