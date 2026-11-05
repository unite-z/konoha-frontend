export interface ElementoInventario { id: number; nombre: string; activo: boolean }
export interface CuartelInventario { id: number; numero: string; nombre: string; estado: 'vigente' | 'desaparecido' }
export interface SectorInventario {
  id: number
  nombre: string
  activo: boolean
  atencion_demanda: boolean
  capataz_nombre: string | null
  superficie_m2: string
}
export interface PersonaInventario { id: number; nombre: string }
/** Tipo de intervención tercerizada (AV-313). */
export interface TipoIntervencion {
  id: number
  nombre: string
  descripcion: string | null
  /** Se ofrece al registrar la poda de una campaña. */
  es_poda: boolean
  activo: boolean
  /** Intervenciones vigentes que lo usan. */
  usos: number
}
export interface NuevoTipoIntervencion { nombre: string; descripcion: string | null; es_poda: boolean }
export interface AsignacionCapataz {
  id: number
  capataz_id: number
  capataz_nombre: string
  fecha_inicio: string
  fecha_fin: string | null
}
