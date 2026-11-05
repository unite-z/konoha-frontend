export interface AreaVerde {
  id: number
  nombre: string
  lugar: string
  ubicacion: string
  superficie_m2: string
  tipo_cobertura_id: number | null
  tipo_cobertura_nombre: string | null
  tipo_uso_id?: number | null
  tipo_uso_nombre?: string | null
  cuartel_id?: number | null
  cuartel_numero?: string | null
  sector_id?: number | null
  sector_nombre?: string | null
  activo: boolean
}

export interface PaginaAreasVerdes {
  count: number
  next: number | null
  previous: number | null
  results: AreaVerde[]
}
