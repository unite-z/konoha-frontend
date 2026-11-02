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
export interface AsignacionCapataz {
  id: number
  capataz_id: number
  capataz_nombre: string
  fecha_inicio: string
  fecha_fin: string | null
}
