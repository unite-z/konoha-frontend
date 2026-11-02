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
