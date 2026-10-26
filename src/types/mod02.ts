export interface CoberturaVegetal {
  id: number
  nombre: string
  activo: boolean
}

export interface AreaVerde {
  id: number
  nombre: string
  lugar: string
  ubicacion: string
  superficie_m2: string
  tipo_cobertura_id: number | null
  tipo_cobertura_nombre: string | null
  tipo_uso_id: number | null
  tipo_uso_nombre: string | null
  cuartel_id: number | null
  cuartel_numero: string | null
  sector_id: number | null
  sector_nombre: string | null
  activo: boolean
}

export interface UsoFuenteMapa {
  uso_fuente: string
  tipo_uso_id: number | null
  tipo_uso_nombre: string | null
}

export interface PoligonoMapaAsignado {
  id_fuente: string
  area_verde_id: number | null
  area_verde_nombre: string | null
}

export interface PaginaAreasVerdes {
  count: number
  next: number | null
  previous: number | null
  results: AreaVerde[]
}

export interface AreaVerdeEntrada {
  nombre: string
  lugar: string
  ubicacion: string
  superficie_m2: string
  tipo_cobertura_id: number | null
  tipo_uso_id: number | null
  cuartel_id: number | null
  sector_id: number | null
}

export interface ElementoInventario {
  id: number
  nombre: string
  activo: boolean
}

export interface CuartelInventario {
  id: number
  numero: string
  nombre: string
  estado: 'vigente' | 'desaparecido'
}

export interface SectorInventario {
  id: number
  nombre: string
  activo: boolean
  atencion_demanda: boolean
  capataz_nombre: string | null
  superficie_m2: string
}

export interface PersonaInventario {
  id: number
  nombre: string
}

export interface AsignacionCapataz {
  id: number
  capataz_id: number
  capataz_nombre: string
  fecha_inicio: string
  fecha_fin: string | null
}

export interface AsignacionSectorInventario {
  id: number
  sector_id: number
  sector_nombre: string
  fecha_inicio: string
  fecha_fin: string | null
}

export interface EspecieVegetal {
  id: number
  nombre_comun: string | null
  nombre_cientifico: string | null
  forma_biologica: string | null
  activo: boolean
}

export interface EjemplarInventario {
  id: number
  codigo: string
  referencia_catastro: string | null
  codigo_catastro: string | null
  codigo_placa_antigua: string | null
  especie_id: number | null
  especie_nombre_comun: string | null
  especie_nombre_cientifico: string | null
  especie_forma_biologica: string | null
  tipo_vegetacion: string | null
  ubicacion: string | null
  latitud: string | null
  longitud: string | null
  cantidad: number
  area_verde_id: number | null
  advertencia_placa_repetida: boolean
}
